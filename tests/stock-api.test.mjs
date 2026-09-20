import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import { apiHandler } from "../src/server/http/handler.js";
import Product from "../src/server/models/Product.js";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import StockReservation from "../src/server/models/StockReservation.js";
import { getStockItems, getStockMovements, getStockByProduct, getReservations, createOpeningStock, adjustStock, transferStock } from "../src/server/services/stockApiService.js";

const primaryUri = "mongodb://127.0.0.1:27017/warehouse_system_next";
const transactionUri = "mongodb://127.0.0.1:27018/warehouse_system_stock_test?replicaSet=stockTestRs";
const uri = process.env.MONGODB_URI;
const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
const created = { users: [], products: [], warehouses: [] };
const handlers = {
  list: apiHandler(getStockItems, { auth: true }),
  movements: apiHandler(getStockMovements, { auth: true }),
  product: apiHandler(getStockByProduct, { auth: true }),
  reservations: apiHandler(getReservations, { auth: true }),
  opening: apiHandler(createOpeningStock, { auth: true, roles: ["admin", "manager", "warehouse_staff"] }),
  adjustment: apiHandler(adjustStock, { auth: true, roles: ["admin", "manager", "warehouse_staff"] }),
  transfer: apiHandler(transferStock, { auth: true, roles: ["admin", "manager", "warehouse_staff"] }),
};

async function call(handler, path, { method = "GET", user, body, params } = {}) {
  const headers = body === undefined ? {} : { "content-type": "application/json" };
  if (user) headers.authorization = `Bearer ${generateToken(user._id)}`;
  const response = await handler(new Request(`http://stock.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), { params: Promise.resolve(params ?? {}) });
  return { status: response.status, body: await response.json() };
}

function expect(result, code, message) {
  assert.equal(result.status, code, JSON.stringify(result.body));
  if (message instanceof RegExp) assert.match(result.body.message, message);
  else if (message) assert.equal(result.body.message, message);
  return result.body;
}

test("stock API routes preserve source contracts, authorization, filters, and transaction rollback", { timeout: 120000 }, async (t) => {
  assert.ok([primaryUri, transactionUri].includes(uri), "Refusing an unapproved database");
  await mongoose.connect(uri);
  t.after(async () => {
    const productIds = created.products.map((item) => item._id);
    await StockReservation.deleteMany({ productId: { $in: productIds } });
    await StockMovement.deleteMany({ productId: { $in: productIds } });
    await StockItem.deleteMany({ productId: { $in: productIds } });
    await Product.deleteMany({ _id: { $in: productIds } });
    await Warehouse.deleteMany({ _id: { $in: created.warehouses.map((item) => item._id) } });
    await User.deleteMany({ _id: { $in: created.users.map((item) => item._id) } });
    await mongoose.disconnect();
  });

  const makeUser = async (role) => {
    const user = await User.create({ firstName: "Stock", lastName: role, email: `stock-api-${role}-${suffix}@example.invalid`, password: "Password9!", role });
    created.users.push(user); return user;
  };
  const admin = await makeUser("admin");
  const manager = await makeUser("manager");
  const warehouseStaff = await makeUser("warehouse_staff");
  const staff = await makeUser("staff");
  const product = await Product.create({ name: `Stock API ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 10, stockLevels: { reorderLevel: 20 } });
  const otherProduct = await Product.create({ name: `Other Stock ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 2 });
  created.products.push(product, otherProduct);
  const source = await Warehouse.create({ warehouseCode: `SA${suffix}`.toUpperCase(), name: `Source ${suffix}`, type: "main" });
  const destination = await Warehouse.create({ warehouseCode: `SB${suffix}`.toUpperCase(), name: `Destination ${suffix}`, type: "branch" });
  created.warehouses.push(source, destination);

  await t.test("read routes require authentication and writes match the source role matrix", async () => {
    expect(await call(handlers.list, "/api/stock"), 401, "Not authorized, no token provided");
    expect(await call(handlers.movements, "/api/stock/movements"), 401, "Not authorized, no token provided");
    expect(await call(handlers.opening, "/api/stock/opening", { method: "POST", user: staff, body: {} }), 403, "Role 'staff' is not authorized for this action");
    expect(await call(handlers.opening, "/api/stock/opening", { method: "POST", user: manager, body: {} }), 400, "warehouseId is required");
    expect(await call(handlers.opening, "/api/stock/opening", { method: "POST", user: warehouseStaff, body: { warehouseId: source._id, items: [] } }), 400, "At least one item is required");
  });

  await t.test("opening stock writes exact audit, cost, and response data", async () => {
    const result = expect(await call(handlers.opening, "/api/stock/opening", { method: "POST", user: warehouseStaff, body: { warehouseId: source._id, notes: "initial", items: [{ productId: product._id, quantity: 10, costPerUnit: 5 }] } }), 201, "Opening stock recorded for 1 items");
    assert.equal(result.data[0].movementNumber.startsWith("MOV-"), true);
    const item = await StockItem.findOne({ productId: product._id, warehouseId: source._id });
    const movement = await StockMovement.findOne({ productId: product._id, movementType: "opening_stock" });
    const refreshed = await Product.findById(product._id);
    assert.equal(item.quantities.onHand, 10); assert.equal(movement.reason, "Opening stock entry"); assert.equal(movement.notes, "initial");
    assert.equal(refreshed.costs.lastPurchaseCost, 5); assert.equal(refreshed.costs.averageCost, 5);
  });

  await t.test("read contracts expose original filters, population, aggregation, and empty behavior", async () => {
    const list = expect(await call(handlers.list, `/api/stock?search=${encodeURIComponent("Stock API")}&lowStock=true&page=1&limit=1`, { user: admin }), 200);
    assert.equal(list.count, 1); assert.equal(list.total, 1); assert.equal(list.totalPages, 1); assert.equal(list.data[0].productId.name, product.name);
    const byProduct = expect(await call(handlers.product, `/api/stock/by-product/${product._id}`, { user: admin, params: { productId: product._id.toString() } }), 200);
    assert.deepEqual(byProduct.data.totals, { onHand: 10, reserved: 0, available: 10 }); assert.equal(byProduct.data.items[0].warehouseId.warehouseCode, source.warehouseCode);
    const missing = expect(await call(handlers.product, `/api/stock/by-product/${new mongoose.Types.ObjectId()}`, { user: admin, params: { productId: new mongoose.Types.ObjectId().toString() } }), 200);
    assert.deepEqual(missing.data.totals, { onHand: 0, reserved: 0, available: 0 });
    const movements = expect(await call(handlers.movements, `/api/stock/movements?productId=${product._id}&warehouseId=${source._id}&movementType=opening_stock&startDate=2000-01-01&page=1&limit=1`, { user: admin }), 200);
    assert.equal(movements.count, 1); assert.equal(movements.data[0].productId.productCode, product.productCode); assert.equal(movements.data[0].performedBy.firstName, warehouseStaff.firstName);
    const reservations = expect(await call(handlers.reservations, "/api/stock/reservations", { user: admin }), 200);
    assert.equal(reservations.count, 0); assert.deepEqual(reservations.data, []);
  });

  await t.test("adjustment preserves metadata and insufficient-stock error", async () => {
    const adjusted = expect(await call(handlers.adjustment, "/api/stock/adjustment", { method: "POST", user: manager, body: { warehouseId: source._id, notes: "counted", reason: "cycle count", items: [{ productId: product._id, adjustmentQuantity: 3, costPerUnit: 7 }] } }), 201, "Adjusted 1 items");
    assert.equal(adjusted.data[0].movementType, "adjustment_in"); assert.equal(adjusted.data[0].reason, "cycle count");
    expect(await call(handlers.adjustment, "/api/stock/adjustment", { method: "POST", user: manager, body: { warehouseId: source._id, items: [{ productId: product._id, adjustmentQuantity: -99 }] } }), 500, "Insufficient stock. On hand: 13, requested: 99");
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: source._id })).quantities.onHand, 13);
  });

  await t.test("transfer uses source and destination movements, validates source inputs, and rolls back partial work", async () => {
    const invalid = expect(await call(handlers.transfer, "/api/stock/transfer", { method: "POST", user: warehouseStaff, body: { toWarehouseId: destination._id, items: [] } }), 400, "fromWarehouseId and toWarehouseId are required");
    assert.equal(invalid.success, false);
    expect(await call(handlers.transfer, "/api/stock/transfer", { method: "POST", user: warehouseStaff, body: { fromWarehouseId: source._id, toWarehouseId: source._id, items: [{ productId: product._id, quantity: 1 }] } }), 400, "From and to warehouses must be different");
    const transferred = expect(await call(handlers.transfer, "/api/stock/transfer", { method: "POST", user: warehouseStaff, body: { fromWarehouseId: source._id, toWarehouseId: destination._id, notes: "move", items: [{ productId: product._id, quantity: 4 }] } }), 201, "Transferred 1 items");
    assert.equal(transferred.data[0].out.movementType, "transfer_out"); assert.equal(transferred.data[0].in.movementType, "transfer_in");
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: source._id })).quantities.onHand, 9);
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: destination._id })).quantities.onHand, 4);
    const before = await StockMovement.countDocuments({ productId: product._id });
    expect(await call(handlers.transfer, "/api/stock/transfer", { method: "POST", user: admin, body: { fromWarehouseId: source._id, toWarehouseId: destination._id, items: [{ productId: product._id, quantity: 1 }, { productId: otherProduct._id, quantity: 1 }] } }), 500, "No stock found for this product in the selected warehouse");
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: source._id })).quantities.onHand, 9);
    assert.equal(await StockMovement.countDocuments({ productId: product._id }), before);
  });

  await t.test("opening and adjustment failure paths leave no partial transaction state", async () => {
    const itemCount = await StockItem.countDocuments({ productId: product._id });
    const movementCount = await StockMovement.countDocuments({ productId: product._id });
    expect(await call(handlers.opening, "/api/stock/opening", { method: "POST", user: admin, body: { warehouseId: destination._id, items: [{ productId: product._id, quantity: 2, costPerUnit: 8 }, { productId: new mongoose.Types.ObjectId(), quantity: 1 }] } }), 500, /Product .* not found/);
    assert.equal(await StockItem.countDocuments({ productId: product._id }), itemCount); assert.equal(await StockMovement.countDocuments({ productId: product._id }), movementCount);
    expect(await call(handlers.adjustment, "/api/stock/adjustment", { method: "POST", user: admin, body: { warehouseId: source._id, items: [{ productId: product._id, adjustmentQuantity: 1 }, { productId: otherProduct._id, adjustmentQuantity: -1 }] } }), 500, "No stock found for this product in the selected warehouse");
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: source._id })).quantities.onHand, 9);
  });
});

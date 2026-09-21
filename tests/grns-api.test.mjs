import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import GoodsReceiptNote from "../src/server/models/GoodsReceiptNote.js";
import PurchaseOrder from "../src/server/models/PurchaseOrder.js";
import Product from "../src/server/models/Product.js";
import Supplier from "../src/server/models/Supplier.js";
import Warehouse from "../src/server/models/Warehouse.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import User from "../src/server/models/User.js";
import Counter from "../src/server/models/Counter.js";
import { GET as list, POST as create } from "../src/app/api/grns/route.js";
import { DELETE as cancel, GET as detail } from "../src/app/api/grns/[id]/route.js";

const uri = "mongodb://127.0.0.1:27018/warehouse_system_grn_test?replicaSet=stockTestRs";
function request(method, path, user, body) {
  return new Request(`http://grn.test${path}`, { method, headers: { ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function call(handler, path, { method = "GET", user, body, params = {} } = {}) {
  const response = await handler(request(method, path, user, body), { params: Promise.resolve(params) });
  return { status: response.status, body: await response.json() };
}
function expect(result, status, message) { assert.equal(result.status, status, JSON.stringify(result.body)); if (message) assert.equal(result.body.message, message); return result.body; }

test("GRN source contract preserves transactional receipt, PO/stock integration, reads, authorization, and source cancellation defect", { timeout: 120000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const created = { grns: [], pos: [], products: [], suppliers: [], warehouses: [], users: [] };
  const track = (type, value) => { created[type].push(value._id); return value; };
  t.after(async () => {
    try {
      await GoodsReceiptNote.collection.deleteMany({ _id: { $in: created.grns } });
      await PurchaseOrder.collection.deleteMany({ _id: { $in: created.pos } });
      await StockMovement.collection.deleteMany({ productId: { $in: created.products } });
      await StockItem.collection.deleteMany({ productId: { $in: created.products } });
      await Product.collection.deleteMany({ _id: { $in: created.products } });
      await Supplier.collection.deleteMany({ _id: { $in: created.suppliers } });
      await Warehouse.collection.deleteMany({ _id: { $in: created.warehouses } });
      await User.collection.deleteMany({ _id: { $in: created.users } });
    } finally { await mongoose.disconnect(); }
  });
  const admin = track("users", await User.create({ firstName: "GRN", lastName: "Admin", email: `grn-admin-${suffix}@example.invalid`, password: "Password9!", role: "admin" }));
  const manager = track("users", await User.create({ firstName: "GRN", lastName: "Manager", email: `grn-manager-${suffix}@example.invalid`, password: "Password9!", role: "manager" }));
  const staff = track("users", await User.create({ firstName: "GRN", lastName: "Staff", email: `grn-staff-${suffix}@example.invalid`, password: "Password9!", role: "warehouse_staff" }));
  const accountant = track("users", await User.create({ firstName: "GRN", lastName: "Accountant", email: `grn-accountant-${suffix}@example.invalid`, password: "Password9!", role: "accountant" }));
  const supplier = track("suppliers", await Supplier.create({ displayName: `GRN supplier ${suffix}`, supplierCode: `GRN${suffix}` }));
  const warehouse = track("warehouses", await Warehouse.create({ warehouseCode: `GRN${suffix}`.toUpperCase(), name: `GRN warehouse ${suffix}` }));
  const product = track("products", await Product.create({ name: `GRN product ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 1 }));
  const makePo = async (ordered = 10, status = "approved") => track("pos", await PurchaseOrder.create({ supplierId: supplier._id, supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode }, deliverTo: { warehouseId: warehouse._id, warehouseName: warehouse.name }, status, items: [{ productId: product._id, productCode: product.productCode, productName: product.name, unitOfMeasure: "pcs", orderedQuantity: ordered, unitPrice: 20 }], createdBy: admin._id }));
  const bodyFor = (po, quantity, extras = {}) => ({ purchaseOrderId: String(po._id), warehouseId: String(warehouse._id), supplierId: String(supplier._id), items: [{ poLineItemId: String(po.items[0]._id), productId: String(product._id), receivedQuantity: quantity, acceptedQuantity: quantity, unitPrice: 20, ...extras }], ...extras });

  await t.test("auth, validation, and PO restrictions use the source matrix and messages", async () => {
    expect(await call(list, "/api/grns"), 401, "Not authorized, no token provided");
    const po = await makePo();
    expect(await call(create, "/api/grns", { method: "POST", user: accountant, body: bodyFor(po, 1) }), 403, "Role 'accountant' is not authorized for this action");
    expect(await call(create, "/api/grns", { method: "POST", user: staff, body: { warehouseId: String(warehouse._id), items: [] } }), 400, "Validation failed");
    expect(await call(create, "/api/grns", { method: "POST", user: staff, body: { warehouseId: String(warehouse._id), items: [{ productId: String(product._id), receivedQuantity: 1, unitPrice: 2 }] } }), 400, "Supplier ID is required for GRN without Purchase Order");
    const draft = await makePo(2, "draft");
    expect(await call(create, "/api/grns", { method: "POST", user: staff, body: bodyFor(draft, 1) }), 400, "Cannot receive against PO with status 'draft'");
  });

  const po = await makePo(10);
  let first;
  await t.test("first partial receipt creates a numbered GRN, snapshots, stock and movement", async () => {
    const response = expect(await call(create, "/api/grns", { method: "POST", user: staff, body: bodyFor(po, 4, { freeQuantity: 1, batchNumber: "BATCH-A", billDiscountPercent: 10 }) }), 201);
    first = response.data; created.grns.push(first._id);
    assert.match(first.grnNumber, /^GRN-\d+$/); assert.equal(first.status, "received"); assert.equal(first.supplierName, supplier.displayName);
    assert.equal(first.items[0].orderedQuantity, 10); assert.equal(first.items[0].acceptedQuantity, 4); assert.equal(first.items[0].freeQuantity, 0, "validator strips source-unsupported freeQuantity");
    assert.equal(first.totalReceivedValue, 72, "source validator retains bill discount");
    const stock = await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id, batchNumber: "BATCH-A" });
    assert.equal(stock.quantities.onHand, 4); assert.equal(stock.costPerUnit, 18);
    const movement = await StockMovement.findById(first.items[0].stockMovementId);
    assert.equal(movement.movementType, "purchase_receipt"); assert.equal(movement.quantity, 4); assert.equal(movement.sourceDocument.type, "purchase_receipt"); assert.equal(String(movement.sourceDocument.id), first._id); assert.equal(movement.sourceDocument.number, first.grnNumber);
    const current = await PurchaseOrder.findById(po._id); assert.equal(current.items[0].receivedQuantity, 4); assert.equal(current.items[0].pendingQuantity, 6); assert.equal(current.status, "partially_received"); assert.equal(current.receiptCompletionPercent, 40); assert.equal(current.grns.length, 1);
    const storedCounter = await Counter.findById("grn"); assert.equal(storedCounter.sequence, Number(first.grnNumber.slice(4)));
  });
  await t.test("second receipt is cumulative and fully receives the PO", async () => {
    const response = expect(await call(create, "/api/grns", { method: "POST", user: manager, body: bodyFor(await PurchaseOrder.findById(po._id), 6) }), 201);
    created.grns.push(response.data._id);
    const current = await PurchaseOrder.findById(po._id); assert.equal(current.items[0].receivedQuantity, 10); assert.equal(current.items[0].pendingQuantity, 0); assert.equal(current.items[0].lineStatus, "fully_received"); assert.equal(current.status, "fully_received"); assert.equal(current.receiptCompletionPercent, 100); assert.equal(current.grns.length, 2);
    const stock = await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id, batchNumber: null }); assert.equal(stock.quantities.onHand, 6);
  });
  await t.test("read endpoints filter, paginate, populate and hide soft-deleted records", async () => {
    const listed = expect(await call(list, `/api/grns?purchaseOrderId=${po._id}&page=1&limit=1`, { user: admin }), 200); assert.equal(listed.count, 1); assert.equal(listed.total, 2); assert.equal(listed.page, 1); assert.equal(listed.totalPages, 2); assert.equal(listed.data[0].purchaseOrderId.poNumber, po.poNumber);
    const found = expect(await call(detail, `/api/grns/${first._id}`, { user: admin, params: { id: first._id } }), 200); assert.equal(found.data.items[0].productId.name, product.name); assert.equal(found.data.receivedBy.firstName, "GRN");
    const hidden = await GoodsReceiptNote.findById(first._id); hidden.deletedAt = new Date(); await hidden.save(); assert.equal(await GoodsReceiptNote.findById(first._id), null); expect(await call(detail, `/api/grns/${first._id}`, { user: admin, params: { id: first._id } }), 404, "GRN not found");
  });
  await t.test("failed stock creation rolls back the GRN, PO and movements", async () => {
    const rollbackPo = await makePo(2);
    const before = { grns: await GoodsReceiptNote.countDocuments({ purchaseOrderId: rollbackPo._id }), movements: await StockMovement.countDocuments({ productId: product._id }) };
    expect(await call(create, "/api/grns", { method: "POST", user: staff, body: bodyFor(rollbackPo, 1, { productId: String(new mongoose.Types.ObjectId()) }) }), 400, /Product .* not found/.test ? undefined : undefined);
    assert.equal(await GoodsReceiptNote.countDocuments({ purchaseOrderId: rollbackPo._id }), before.grns); assert.equal(await StockMovement.countDocuments({ productId: product._id }), before.movements);
    const current = await PurchaseOrder.findById(rollbackPo._id); assert.equal(current.items[0].receivedQuantity, 0); assert.equal(current.grns.length, 0);
  });
  await t.test("source cancellation attempts reversal but rolls everything back because its model and movement enums reject cancellation", async () => {
    const active = created.grns[1]; const beforeStock = (await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id, batchNumber: null })).quantities.onHand;
    expect(await call(cancel, `/api/grns/${active}`, { method: "DELETE", user: staff, params: { id: active } }), 403, "Role 'warehouse_staff' is not authorized for this action");
    const failure = await call(cancel, `/api/grns/${active}`, { method: "DELETE", user: manager, params: { id: active } }); assert.equal(failure.status, 400); assert.match(failure.body.message, /grn_cancellation|cancelled/);
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id, batchNumber: null })).quantities.onHand, beforeStock);
    assert.equal((await PurchaseOrder.findById(po._id)).items[0].receivedQuantity, 10); assert.equal((await GoodsReceiptNote.findById(active)).status, "received");
  });
});

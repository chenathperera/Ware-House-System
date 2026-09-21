import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import { apiHandler } from "../src/server/http/handler.js";
import DamageRecord from "../src/server/models/DamageRecord.js";
import Product from "../src/server/models/Product.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";
import { increaseStock } from "../src/server/services/stockService.js";
import { createDamage, getDamageById, getDamages, getDamageSummary, writeOffDamage } from "../src/server/services/damageApiService.js";

const transactionUri = "mongodb://127.0.0.1:27018/warehouse_system_damage_test?replicaSet=stockTestRs";
const handlers = {
  list: apiHandler(getDamages, { auth: true }), detail: apiHandler(getDamageById, { auth: true }), summary: apiHandler(getDamageSummary, { auth: true }),
  create: apiHandler(createDamage, { auth: true, roles: ["admin", "manager", "warehouse_staff", "production_staff"] }), writeOff: apiHandler(writeOffDamage, { auth: true, roles: ["admin", "manager"] }),
};
async function call(handler, path, { method = "GET", user, body, params = {} } = {}) { const headers = body === undefined ? {} : { "content-type": "application/json" }; if (user) headers.authorization = `Bearer ${generateToken(user._id)}`; const response = await handler(new Request(`http://damage.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), { params: Promise.resolve(params) }); return { status: response.status, body: await response.json() }; }
function expect(result, status, message) { assert.equal(result.status, status, JSON.stringify(result.body)); if (message) assert.equal(result.body.message, message); return result.body; }

test("Damage API preserves original creation, stock, read, write-off, role, and rollback contracts", { timeout: 120000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, transactionUri);
  await mongoose.connect(transactionUri);
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const user = await User.create({ firstName: "Damage", lastName: "Admin", email: `damage-${suffix}@example.invalid`, password: "Password9!", role: "admin" });
  const staff = await User.create({ firstName: "Damage", lastName: "Staff", email: `damage-staff-${suffix}@example.invalid`, password: "Password9!", role: "staff" });
  const product = await Product.create({ name: `Damage ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 9 });
  const warehouse = await Warehouse.create({ warehouseCode: `DG${suffix}`.toUpperCase(), name: `Damage ${suffix}` });
  await increaseStock({ productId: product._id, warehouseId: warehouse._id, quantity: 10, costPerUnit: 4, movementType: "opening_stock", userId: user._id });
  t.after(async () => { await DamageRecord.deleteMany({ productId: product._id }); await StockMovement.deleteMany({ productId: product._id }); await StockItem.deleteMany({ productId: product._id }); await Product.deleteOne({ _id: product._id }); await Warehouse.deleteOne({ _id: warehouse._id }); await User.deleteMany({ _id: { $in: [user._id, staff._id] } }); await mongoose.disconnect(); });
  await t.test("auth matrix and validation retain original route behavior", async () => {
    expect(await call(handlers.list, "/api/damages"), 401, "Not authorized, no token provided");
    expect(await call(handlers.create, "/api/damages", { method: "POST", user: staff, body: {} }), 403, "Role 'staff' is not authorized for this action");
    expect(await call(handlers.create, "/api/damages", { method: "POST", user, body: { productId: new mongoose.Types.ObjectId(), quantity: 1 } }), 404, "Product not found");
  });
  let adjusted;
  await t.test("adjustStock true creates the damage and one source-linked stock movement", async () => {
    const response = expect(await call(handlers.create, "/api/damages", { method: "POST", user, body: { productId: product._id, warehouseId: warehouse._id, quantity: 3, source: "warehouse_damage", description: "broken", costPerUnit: 5, adjustStock: true } }), 201);
    adjusted = response.data; assert.match(adjusted.damageNumber, /^DMG-/); assert.equal(adjusted.totalValue, 15); assert.equal(adjusted.stockAdjusted, true);
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id })).quantities.onHand, 7);
    const movement = await StockMovement.findById(adjusted.stockMovementId); assert.equal(movement.movementType, "damage"); assert.equal(movement.sourceDocument.type, "damage_record"); assert.equal(movement.sourceDocument.id.toString(), adjusted._id);
  });
  await t.test("adjustStock false creates no stock mutation", async () => {
    const response = expect(await call(handlers.create, "/api/damages", { method: "POST", user, body: { productId: product._id, warehouseId: warehouse._id, quantity: 2, source: "expired", adjustStock: false } }), 201);
    assert.equal(response.data.stockAdjusted, false); assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id })).quantities.onHand, 7); assert.equal(await StockMovement.countDocuments({ productId: product._id, movementType: "damage" }), 1);
  });
  await t.test("list, detail, summary, and write-off preserve original contracts without a second stock decrease", async () => {
    const list = expect(await call(handlers.list, "/api/damages?source=warehouse_damage&page=1&limit=1", { user }), 200); assert.equal(list.count, 1); assert.equal(list.total, 1); assert.equal(list.data[0].productId.name, product.name);
    const detail = expect(await call(handlers.detail, `/api/damages/${adjusted._id}`, { user, params: { id: adjusted._id } }), 200); assert.equal(detail.data.reportedBy.firstName, "Damage");
    const summary = expect(await call(handlers.summary, "/api/damages/summary", { user }), 200); assert.equal(summary.data.totalCount, 2); assert.equal(summary.data.totalValue, 23);
    expect(await call(handlers.writeOff, `/api/damages/${adjusted._id}/write-off`, { method: "PATCH", user: staff, params: { id: adjusted._id } }), 403, "Role 'staff' is not authorized for this action");
    const written = expect(await call(handlers.writeOff, `/api/damages/${adjusted._id}/write-off`, { method: "PATCH", user, params: { id: adjusted._id } }), 200); assert.equal(written.data.writtenOff, true); assert.equal(written.data.writeOffValue, 15); assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id })).quantities.onHand, 7);
  });
  await t.test("a stock failure rolls back the damage record and movement", async () => {
    const before = await DamageRecord.countDocuments({ productId: product._id });
    expect(await call(handlers.create, "/api/damages", { method: "POST", user, body: { productId: product._id, warehouseId: warehouse._id, quantity: 99, source: "theft", adjustStock: true } }), 400, "Insufficient stock. On hand: 7, requested: 99");
    assert.equal(await DamageRecord.countDocuments({ productId: product._id }), before); assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id })).quantities.onHand, 7);
  });
});

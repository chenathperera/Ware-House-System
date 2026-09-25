import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Counter from "../src/server/models/Counter.js";
import CustomerReturn from "../src/server/models/CustomerReturn.js";
import Product from "../src/server/models/Product.js";
import RepairOrder from "../src/server/models/RepairOrder.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";
import { completeRepair, getRepairById, getRepairs, startRepair } from "../src/server/services/repairApiService.js";

const uri = "mongodb://127.0.0.1:27018/?replicaSet=stockTestRs";
const dbName = "warehouse_system_repair_orders_test";
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });

test("Repair Orders preserves source lifecycle, Customer Return compatibility, filters, costs, and repair-in transactions", { timeout: 120000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved repair orders replica-set URI");
  assert.equal(process.env.MONGODB_DB_NAME, dbName, "Refusing an unapproved repair orders test database");
  await mongoose.connect(uri, { dbName, autoIndex: false, autoCreate: false });
  const created = { products: [], repairs: [], users: [], warehouses: [], returns: [] };
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const add = (group, document) => (created[group].push(document._id), document);
  const makeRepair = async (overrides = {}) => add("repairs", await RepairOrder.create({
    productId: product._id, productCode: product.productCode, productName: product.name, quantity: 2,
    issueDescription: "Source-parity repair", createdBy: admin._id, ...overrides,
  }));

  t.after(async () => {
    try {
      await Promise.all([
        RepairOrder.collection.deleteMany({ _id: { $in: created.repairs } }),
        StockMovement.collection.deleteMany({ productId: { $in: created.products } }),
        StockItem.collection.deleteMany({ productId: { $in: created.products } }),
        CustomerReturn.collection.deleteMany({ _id: { $in: created.returns } }),
        Product.collection.deleteMany({ _id: { $in: created.products } }),
        Warehouse.collection.deleteMany({ _id: { $in: created.warehouses } }),
        User.collection.deleteMany({ _id: { $in: created.users } }),
        Counter.collection.deleteMany({ _id: "repair" }),
      ]);
    } finally { await mongoose.disconnect(); }
  });

  const admin = add("users", await User.create({ firstName: "Repair", lastName: "Admin", email: `repair-${suffix}@example.test`, password: "Password9!", role: "admin" }));
  const technician = add("users", await User.create({ firstName: "Repair", lastName: "Technician", email: `technician-${suffix}@example.test`, password: "Password9!", role: "warehouse_staff" }));
  const product = add("products", await Product.create({ name: `Repair Product ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pcs", basePrice: 10, costs: { averageCost: 7.5 } }));
  const warehouse = add("warehouses", await Warehouse.create({ name: `Repair Warehouse ${suffix}`, warehouseCode: `RP${suffix}`.toUpperCase() }));
  const customerReturn = add("returns", await CustomerReturn.create({ rmaNumber: `RMA-${suffix}`, customerId: new mongoose.Types.ObjectId(), items: [] }));

  await t.test("list/detail preserve filters and Customer Return population", async () => {
    const returnRepair = await makeRepair({ sourceType: "customer_return", customerReturnId: customerReturn._id, issueDescription: "Return inspection" });
    await makeRepair({ status: "awaiting_parts" });
    const list = response();
    await getRepairs({ query: { status: "pending", productId: String(product._id), page: "1", limit: "10" } }, list);
    assert.equal(list.body.success, true); assert.equal(list.body.total, 1); assert.equal(list.body.data[0]._id.toString(), returnRepair._id.toString());
    const detail = response();
    await getRepairById({ params: { id: String(returnRepair._id) } }, detail);
    assert.equal(detail.body.data.customerReturnId.rmaNumber, customerReturn.rmaNumber);
    assert.equal(detail.body.data.sourceType, "customer_return");
  });

  await t.test("start assigns supplied technician or current user and rejects invalid lifecycle transitions", async () => {
    const assigned = await makeRepair();
    await startRepair({ params: { id: String(assigned._id) }, body: { assignedTechnicianId: String(technician._id) }, user: admin }, response());
    const started = await RepairOrder.findById(assigned._id);
    assert.equal(started.status, "in_progress"); assert.equal(String(started.assignedTechnicianId), String(technician._id)); assert.ok(started.startedAt);
    const fallback = await makeRepair();
    await startRepair({ params: { id: String(fallback._id) }, body: {}, user: admin }, response());
    assert.equal(String((await RepairOrder.findById(fallback._id)).assignedTechnicianId), String(admin._id));
    const invalid = response();
    await assert.rejects(() => startRepair({ params: { id: String(assigned._id) }, body: {}, user: admin }, invalid), /Cannot start repair/);
    assert.equal(invalid.statusCode, 400);
  });

  await t.test("completion records fixed and unfixable outcomes, costs, and stock", async () => {
    const fixed = await makeRepair({ status: "in_progress" });
    const fixedResponse = response();
    await completeRepair({ params: { id: String(fixed._id) }, user: admin, body: { outcome: "fixed", disposition: "return_to_stock", actualLaborHours: 1.5, actualLaborCost: 12.35, actualPartsCost: 7.65, returnedToWarehouseId: String(warehouse._id), notes: "Fixed" } }, fixedResponse);
    const completed = await RepairOrder.findById(fixed._id);
    const movement = await StockMovement.findById(completed.stockMovementId);
    assert.equal(fixedResponse.body.success, true); assert.equal(completed.status, "completed_fixed"); assert.equal(completed.totalActualCost, 20); assert.equal(completed.disposition, "return_to_stock");
    assert.equal(movement.movementType, "repair_in"); assert.equal(movement.quantity, 2); assert.equal(movement.sourceDocument.type, "repair_order");
    assert.equal((await StockItem.findOne({ productId: product._id, warehouseId: warehouse._id })).quantities.onHand, 2);
    const unfixable = await makeRepair({ status: "awaiting_parts" });
    await completeRepair({ params: { id: String(unfixable._id) }, user: admin, body: { outcome: "unfixable", actualLaborCost: 4, actualPartsCost: 1 } }, response());
    const discarded = await RepairOrder.findById(unfixable._id);
    assert.equal(discarded.status, "completed_unfixable"); assert.equal(discarded.totalActualCost, 5); assert.equal(discarded.stockMovementId, undefined);
  });

  await t.test("failed repair-in stock work rolls back the repair completion", async () => {
    const repair = await makeRepair({ status: "in_progress" });
    const failure = response();
    await assert.rejects(() => completeRepair({ params: { id: String(repair._id) }, user: admin, body: { outcome: "fixed", disposition: "return_to_stock", returnedToWarehouseId: String(new mongoose.Types.ObjectId()) } }, failure), /Warehouse .* not found/);
    assert.equal(failure.statusCode, 400);
    const unchanged = await RepairOrder.findById(repair._id);
    assert.equal(unchanged.status, "in_progress"); assert.equal(await StockMovement.countDocuments({ "sourceDocument.id": repair._id }), 0);
  });
});

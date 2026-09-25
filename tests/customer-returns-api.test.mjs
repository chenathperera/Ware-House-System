import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Counter from "../src/server/models/Counter.js";
import CreditNote from "../src/server/models/CreditNote.js";
import Customer from "../src/server/models/Customer.js";
import CustomerReturn from "../src/server/models/CustomerReturn.js";
import DamageRecord from "../src/server/models/DamageRecord.js";
import Product from "../src/server/models/Product.js";
import RepairOrder from "../src/server/models/RepairOrder.js";
import StockItem from "../src/server/models/StockItem.js";
import StockMovement from "../src/server/models/StockMovement.js";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";
import { approveReturn, createReturn, getEligibleOrders, issueCreditNote, processReturn, receiveReturn } from "../src/server/services/customerReturnApiService.js";

const uri = "mongodb://127.0.0.1:27018/?replicaSet=stockTestRs";
const dbName = "warehouse_system_customer_returns_test";
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });

test("Customer Returns preserves lifecycle processing transactions and non-transactional credit issuance", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing a database URI other than the approved Customer Returns test replica set");
  assert.equal(process.env.MONGODB_DB_NAME, dbName, "Refusing a database other than the approved Customer Returns test database");
  await mongoose.connect(uri, { dbName, autoIndex: false, autoCreate: false });
  const created = { customers: [], products: [], returns: [], users: [], warehouses: [] };
  const add = (group, document) => (created[group].push(document._id), document);
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);

  t.after(async () => {
    try {
      await Promise.all([
        CustomerReturn.collection.deleteMany({ _id: { $in: created.returns } }),
        CreditNote.collection.deleteMany({ "customerSnapshot.code": `CRT${suffix}` }),
        DamageRecord.collection.deleteMany({ "sourceDocument.number": { $regex: `RMA-` } }),
        RepairOrder.collection.deleteMany({ customerReturnId: { $in: created.returns } }),
        StockMovement.collection.deleteMany({ "sourceDocument.id": { $in: created.returns } }),
        StockItem.collection.deleteMany({ "warehouseId": { $in: created.warehouses } }),
        Customer.collection.deleteMany({ _id: { $in: created.customers } }),
        Product.collection.deleteMany({ _id: { $in: created.products } }),
        Warehouse.collection.deleteMany({ _id: { $in: created.warehouses } }),
        User.collection.deleteMany({ _id: { $in: created.users } }),
      ]);
      await Counter.collection.deleteMany({ _id: { $in: ["rma", "credit_note", "repair"] } });
    } finally {
      await mongoose.disconnect();
    }
  });

  const user = add("users", await User.create({ firstName: "Return", lastName: "Tester", email: `customer-return-${suffix}@example.test`, password: "Password9!", role: "admin" }));
  const customer = add("customers", await Customer.create({ displayName: `Return Customer ${suffix}`, customerCode: `CRT${suffix}` }));
  const warehouse = add("warehouses", await Warehouse.create({ name: `Return Warehouse ${suffix}`, warehouseCode: `RW${suffix}`.toUpperCase() }));
  const restockProduct = add("products", await Product.create({ name: `Restock ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pc", basePrice: 10 }));
  const scrapProduct = add("products", await Product.create({ name: `Scrap ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pc", basePrice: 10 }));
  const repairProduct = add("products", await Product.create({ name: `Repair ${suffix}`, categoryId: new mongoose.Types.ObjectId(), unitOfMeasure: "pc", basePrice: 10 }));

  const createResponse = response();
  await createReturn({ body: { customerId: String(customer._id), items: [
    { productId: String(restockProduct._id), quantityReturned: 2, unitPrice: 10, reason: "defective" },
    { productId: String(scrapProduct._id), quantityReturned: 1, unitPrice: 11, reason: "damaged_on_arrival" },
    { productId: String(repairProduct._id), quantityReturned: 1, unitPrice: 12, reason: "other", refundable: false },
  ] }, user }, createResponse);
  const returnId = createResponse.body.data._id;
  created.returns.push(returnId);
  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.totalReturnValue, 43);
  assert.equal(createResponse.body.data.netRefundAmount, 31);

  await approveReturn({ params: { id: returnId }, user }, response());
  await receiveReturn({ params: { id: returnId }, body: { warehouseId: String(warehouse._id) }, user }, response());
  const received = await CustomerReturn.findById(returnId);
  const processResponse = response();
  await processReturn({ params: { id: returnId }, body: { items: [
    { itemId: String(received.items[0]._id), condition: "resellable", disposition: "restock", refundAmount: 20, refundable: true },
    { itemId: String(received.items[1]._id), condition: "damaged", disposition: "scrap", refundAmount: 11, refundable: true },
    { itemId: String(received.items[2]._id), condition: "repairable", disposition: "repair", refundAmount: 0, refundable: false },
  ] }, user }, processResponse);
  const processed = await CustomerReturn.findById(returnId);
  assert.equal(processed.status, "processed");
  assert.ok(processed.items[0].stockMovementId);
  assert.ok(processed.items[1].damageRecordId);
  assert.ok(processed.items[2].repairOrderId);
  assert.equal((await StockItem.findOne({ productId: restockProduct._id, warehouseId: warehouse._id })).quantities.onHand, 2);
  assert.equal((await DamageRecord.findById(processed.items[1].damageRecordId)).source, "customer_return");
  assert.equal((await RepairOrder.findById(processed.items[2].repairOrderId)).sourceType, "customer_return");

  const creditResponse = response();
  await issueCreditNote({ params: { id: returnId }, user }, creditResponse);
  assert.equal(creditResponse.body.data.return.status, "completed");
  assert.equal(creditResponse.body.data.return.refundMethod, "credit_note");
  assert.equal(creditResponse.body.data.creditNote.amount, 31);

  const eligibleResponse = response();
  await getEligibleOrders({ query: { customerId: String(customer._id) } }, eligibleResponse);
  assert.deepEqual(eligibleResponse.body.data, []);
});

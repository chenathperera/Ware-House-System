import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Counter from "../src/server/models/Counter.js";
import RepairOrder from "../src/server/models/RepairOrder.js";

const uri = "mongodb://127.0.0.1:27018/?replicaSet=stockTestRs";
const dbName = "warehouse_system_repair_orders_test";

test("RepairOrder supports the exact Customer Return transaction creation contract", async () => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved database URI");
  assert.equal(process.env.MONGODB_DB_NAME, dbName, "Refusing an unapproved database name");
  await mongoose.connect(uri, { dbName, autoIndex: false, autoCreate: false });
  const session = await mongoose.startSession();
  const repairId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const returnId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  try {
    await session.withTransaction(async () => {
      const repair = new RepairOrder({
        _id: repairId,
        productId,
        productCode: "PRD-RETURN",
        productName: "Returned product",
        quantity: 2,
        sourceType: "customer_return",
        customerReturnId: returnId,
        issueDescription: "Inspection finding",
        createdBy: userId,
      });
      await repair.save({ session });

      assert.match(repair.repairNumber, /^REP-\d+$/);
      assert.equal(repair.status, "pending");
      assert.equal(repair.disposition, "pending");
      assert.equal(repair.totalActualCost, 0);
      assert.equal(String(repair.customerReturnId), String(returnId));
      assert.equal(String(repair.createdBy), String(userId));
    });

    const stored = await RepairOrder.findById(repairId);
    assert.equal(stored.sourceType, "customer_return");
    assert.equal(stored.issueDescription, "Inspection finding");
    assert.equal(stored.quantity, 2);
    stored.actualLaborCost = 12.345;
    stored.actualPartsCost = 7.655;
    await stored.save();
    assert.equal(stored.totalActualCost, 20);
  } finally {
    await session.endSession();
    await RepairOrder.collection.deleteOne({ _id: repairId });
    await Counter.collection.deleteOne({ _id: "repair" });
    await mongoose.disconnect();
  }
});

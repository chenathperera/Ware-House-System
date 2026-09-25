import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import SalesOrder from "../src/server/models/SalesOrder.js";

test("SalesOrder source schema preserves numbering, calculations, status vocabulary, and soft deletion", async () => {
  assert.equal(process.env.MONGODB_URI, "mongodb://127.0.0.1:27018/warehouse_system_sales_orders_test?replicaSet=stockTestRs", "Refusing an unapproved database");
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const id = new mongoose.Types.ObjectId();
  const order = new SalesOrder({
    orderNumber: `SO-TEST-${id.toString().slice(-8)}`,
    customerId: id,
    items: [{ productId: new mongoose.Types.ObjectId(), orderedQuantity: 2, listPrice: 100, unitPrice: 100, discountPercent: 10, discountAmount: 5, taxRate: 10, taxable: true }],
    orderDiscount: { type: "percentage", value: 10 },
    shippingCost: 4,
    otherCharges: 1,
  });
  await order.save();
  try {
    assert.equal(order.items[0].lineSubtotal, 200);
    assert.equal(order.items[0].lineDiscount, 25);
    assert.equal(order.items[0].lineTax, 17.5);
    assert.equal(order.items[0].lineTotal, 192.5);
    assert.equal(order.subtotal, 200);
    assert.equal(order.totalDiscount, 25);
    assert.equal(order.totalTax, 17.5);
    assert.equal(order.orderDiscount.amount, 17.5);
    assert.equal(order.grandTotal, 180);
    assert.deepEqual(order.schema.path("status").enumValues, ["draft", "pending_approval", "approved", "partially_dispatched", "dispatched", "partially_delivered", "delivered", "invoiced", "completed", "on_hold", "cancelled"]);
    order.deletedAt = new Date(); await order.save();
    assert.equal(await SalesOrder.findById(order._id), null);
    assert.ok(await SalesOrder.findById(order._id).setOptions({ includeDeleted: true }));
  } finally { await SalesOrder.collection.deleteOne({ _id: order._id }); await mongoose.disconnect(); }
});

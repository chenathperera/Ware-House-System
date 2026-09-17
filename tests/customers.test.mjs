import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Customer from "../src/server/models/Customer.js";
import CustomerGroup from "../src/server/models/CustomerGroup.js";
import User from "../src/server/models/User.js";
import { createCustomer, deleteCustomer, getCustomers, toggleCreditHold, updateCustomer } from "../src/server/services/customerService.js";

const uri = "mongodb://127.0.0.1:27017/warehouse_system_next";
const prefix = `customer-test-${randomUUID()}`;
const ids = [];
const res = () => ({ statusCode: 200, payload: null, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return payload; } });

test("customer service contract", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);
  const user = await User.create({ firstName: "Test", lastName: "Admin", email: `${prefix}@example.invalid`, password: "SyntheticPass9", role: "admin" });
  const group = await CustomerGroup.create({ name: `${prefix} group`, code: prefix.replace(/-/g, "").slice(0, 20) });
  t.after(async () => { await Customer.collection.deleteMany({ _id: { $in: ids } }); await CustomerGroup.collection.deleteOne({ _id: group._id }); await User.collection.deleteOne({ _id: user._id }); await mongoose.disconnect(); });
  const createRes = res();
  await createCustomer({ body: { displayName: "Synthetic Customer", customerGroupId: group._id.toString(), paymentTerms: { type: "credit", creditLimit: 1000 } }, user }, createRes);
  assert.equal(createRes.statusCode, 201); assert.match(createRes.payload.data.customerCode, /^CUST-\d+$/); assert.equal(createRes.payload.data.creditStatus.availableCredit, 1000); ids.push(createRes.payload.data._id);
  const id = ids[0].toString();
  const listRes = res(); await getCustomers({ query: { search: "Synthetic", page: "1", limit: "20" } }, listRes); assert.equal(listRes.payload.total, 1);
  const updateRes = res(); await updateCustomer({ params: { id }, body: { displayName: "Updated Customer" }, user }, updateRes); assert.equal(updateRes.payload.data.displayName, "Updated Customer");
  const holdRes = res(); await toggleCreditHold({ params: { id }, body: { reason: "Test" } }, holdRes); assert.equal(holdRes.payload.data.creditStatus.onCreditHold, true);
  const deleteRes = res(); await deleteCustomer({ params: { id } }, deleteRes); assert.equal(deleteRes.payload.message, "Customer deleted");
});

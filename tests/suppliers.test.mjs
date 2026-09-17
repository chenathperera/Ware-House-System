import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Supplier from "../src/server/models/Supplier.js";
import User from "../src/server/models/User.js";
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
} from "../src/server/services/supplierService.js";

const uri = "mongodb://127.0.0.1:27017/warehouse_system_next";
const prefix = `supplier-test-${randomUUID()}`;
const res = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return payload;
  },
});

test("supplier service contract", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);
  const user = await User.create({
    firstName: "Test",
    lastName: "Admin",
    email: `${prefix}@example.invalid`,
    password: "SyntheticPass9",
    role: "admin",
  });
  let supplierId;
  t.after(async () => {
    if (supplierId) await Supplier.collection.deleteOne({ _id: supplierId });
    await User.collection.deleteOne({ _id: user._id });
    await mongoose.disconnect();
  });
  const created = res();
  await createSupplier(
    {
      body: {
        displayName: "Synthetic Supplier",
        category: "raw_material",
        paymentTerms: { type: "credit", creditDays: 30 },
      },
      user,
    },
    created,
  );
  assert.equal(created.statusCode, 201);
  assert.match(created.payload.data.supplierCode, /^SUP-\d+$/);
  supplierId = created.payload.data._id;
  const listed = res();
  await getSuppliers(
    { query: { search: "Synthetic", page: "1", limit: "20" } },
    listed,
  );
  assert.equal(listed.payload.total, 1);
  const updated = res();
  await updateSupplier(
    {
      params: { id: supplierId.toString() },
      body: { displayName: "Updated Supplier" },
      user,
    },
    updated,
  );
  assert.equal(updated.payload.data.displayName, "Updated Supplier");
  const deleted = res();
  await deleteSupplier({ params: { id: supplierId.toString() } }, deleted);
  assert.equal(deleted.payload.message, "Supplier deleted");
});

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Product from "../src/server/models/Product.js";
import Category from "../src/server/models/Category.js";
import User from "../src/server/models/User.js";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../src/server/services/productService.js";
const uri = "mongodb://127.0.0.1:27017/warehouse_system_next";
const prefix = `product-test-${randomUUID()}`;
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
test("product service contract", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);
  const user = await User.create({
    firstName: "Test",
    lastName: "Admin",
    email: `${prefix}@example.invalid`,
    password: "SyntheticPass9",
    role: "admin",
  });
  const category = await Category.create({
    name: `${prefix} category`,
    code: prefix.replace(/-/g, "").slice(0, 20),
  });
  let id;
  t.after(async () => {
    if (id) await Product.collection.deleteOne({ _id: id });
    await Category.collection.deleteOne({ _id: category._id });
    await User.collection.deleteOne({ _id: user._id });
    await mongoose.disconnect();
  });
  const created = res();
  await createProduct(
    {
      body: {
        name: "Synthetic Product",
        categoryId: category._id.toString(),
        unitOfMeasure: "pcs",
        basePrice: 100,
      },
      user,
    },
    created,
  );
  assert.equal(created.statusCode, 201);
  assert.match(created.payload.data.productCode, /^PRD-\d+$/);
  id = created.payload.data._id;
  const listed = res();
  await getProducts(
    { query: { search: "Synthetic", page: "1", limit: "20" } },
    listed,
  );
  assert.equal(listed.payload.total, 1);
  const updated = res();
  await updateProduct(
    { params: { id: id.toString() }, body: { basePrice: 200 }, user },
    updated,
  );
  assert.equal(updated.payload.data.basePrice, 200);
  const deleted = res();
  await deleteProduct({ params: { id: id.toString() } }, deleted);
  assert.equal(deleted.payload.message, "Product deleted");
});

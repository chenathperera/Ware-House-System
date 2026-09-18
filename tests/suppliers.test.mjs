import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import generateToken from "../src/server/auth/token.js";
import Counter from "../src/server/models/Counter.js";
import Supplier from "../src/server/models/Supplier.js";
import User from "../src/server/models/User.js";
import {
  DELETE as supplierDeleteRoute,
  GET as supplierDetailRoute,
  PUT as supplierPutRoute,
} from "../src/app/api/suppliers/[id]/route.js";
import {
  GET as suppliersGetRoute,
  POST as suppliersPostRoute,
} from "../src/app/api/suppliers/route.js";
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliers,
  updateSupplier,
} from "../src/server/services/supplierService.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "../src/server/validators/supplierValidator.js";

const uri = "mongodb://127.0.0.1:27017/warehouse_system_next";
const prefix = `supplier-parity-${randomUUID()}`;

function response() {
  return {
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
  };
}

function supplierBody(overrides = {}) {
  return {
    type: "company",
    companyName: "  Synthetic Supplier Company  ",
    displayName: "  Synthetic Supplier  ",
    firstName: " First ",
    lastName: " Last ",
    category: "raw_material",
    tags: [" raw ", " preferred "],
    businessRegistrationNumber: " BR-1 ",
    taxRegistrationNumber: " VAT-1 ",
    country: " Sri Lanka ",
    primaryContact: {
      name: " Primary Person ",
      email: "PRIMARY@EXAMPLE.INVALID",
      phone: " 0111234567 ",
      mobile: " 0771234567 ",
    },
    contacts: [
      {
        name: " Accounts Person ",
        designation: " Accountant ",
        email: "ACCOUNTS@EXAMPLE.INVALID",
        phone: " 0119999999 ",
        isPrimary: true,
        notes: " Payment contact ",
      },
      { name: " Delivery Person " },
    ],
    billingAddress: { line1: " Billing line ", city: " Colombo " },
    shippingAddress: { line1: " Shipping line ", city: " Kandy " },
    paymentTerms: { type: "consignment", creditDays: 45, creditLimit: 2000 },
    defaultCurrency: "USD",
    bankDetails: {
      bankName: " Bank ",
      branchName: " Branch ",
      accountNumber: " 123 ",
      accountName: " Supplier Account ",
      swiftCode: " SWIFT ",
    },
    shippingTerms: " CIF ",
    averageLeadTimeDays: 14,
    status: "blacklisted",
    blacklistReason: " Late delivery ",
    notes: " External note ",
    internalNotes: " Internal note ",
    ...overrides,
  };
}

function jsonRequest(method, path, token, body) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("Supplier backend/data contract preserves original behavior", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved database");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

  const ids = { suppliers: [], users: [] };
  const counterBefore = await Counter.collection.findOne({ _id: "supplier" });
  t.after(async () => {
    try {
      for (const id of ids.suppliers) {
        await Supplier.collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
      }
      for (const id of ids.users) await User.collection.deleteOne({ _id: id });
      if (counterBefore) {
        await Counter.collection.replaceOne({ _id: "supplier" }, counterBefore, { upsert: true });
      } else {
        await Counter.collection.deleteOne({ _id: "supplier" });
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  const admin = await User.create({
    firstName: "Supplier",
    lastName: "Admin",
    email: `${prefix}-admin@example.invalid`,
    password: "SyntheticPass9",
    role: "admin",
  });
  const accountant = await User.create({
    firstName: "Supplier",
    lastName: "Accountant",
    email: `${prefix}-accountant@example.invalid`,
    password: "SyntheticPass9",
    role: "accountant",
  });
  const salesRep = await User.create({
    firstName: "Supplier",
    lastName: "Sales",
    email: `${prefix}-sales@example.invalid`,
    password: "SyntheticPass9",
    role: "sales_rep",
  });
  ids.users.push(admin._id, accountant._id, salesRep._id);

  await t.test("validator preserves declared nested payloads, blacklist reason, and stripping", () => {
    const parsed = createSupplierSchema.parse(
      supplierBody({ supplierCode: "OVERRIDE", performance: { rating: 5 } }),
    );
    assert.equal(parsed.blacklistReason, " Late delivery ");
    assert.equal("supplierCode" in parsed, false);
    assert.equal("performance" in parsed, false);
    assert.equal(createSupplierSchema.safeParse({ displayName: "" }).success, false);
    assert.equal(createSupplierSchema.safeParse(supplierBody({ category: "invalid" })).success, false);
    assert.deepEqual(updateSupplierSchema.parse({}), {});
  });

  let supplierId;
  await t.test("create preserves nested data, original trim/defaults, code generation, and response shape", async () => {
    const created = response();
    await createSupplier({ body: supplierBody(), user: admin }, created);
    assert.equal(created.statusCode, 201);
    assert.deepEqual(Object.keys(created.payload).sort(), ["data", "success"]);
    const data = created.payload.data;
    supplierId = data._id;
    ids.suppliers.push(supplierId);
    assert.match(data.supplierCode, /^SUP-\d+$/);
    assert.equal(data.companyName, "Synthetic Supplier Company");
    assert.equal(data.primaryContact.email, "primary@example.invalid");
    assert.equal(data.contacts[0].email, "accounts@example.invalid");
    assert.equal(data.contacts[0].isPrimary, true);
    // Original address fields are raw String schema definitions and retain whitespace.
    assert.equal(data.billingAddress.line1, " Billing line ");
    assert.equal(data.billingAddress.country, "Sri Lanka");
    assert.equal(data.shippingAddress.country, "Sri Lanka");
    assert.equal(data.bankDetails.bankName, "Bank");
    assert.equal(data.bankDetails.swiftCode, "SWIFT");
    assert.equal(data.paymentTerms.type, "consignment");
    assert.equal(data.paymentTerms.creditDays, 45);
    assert.equal(data.performance.rating, 0);
    assert.equal(data.createdBy.toString(), admin._id.toString());
  });

  await t.test("list preserves search/category/status filters, pagination, sorting, and response envelope", async () => {
    const listed = response();
    await getSuppliers(
      {
        query: {
          search: "0111234567",
          category: "raw_material",
          status: "blacklisted",
          page: "1",
          limit: "1",
          sortBy: "displayName",
          sortOrder: "asc",
        },
      },
      listed,
    );
    assert.deepEqual(Object.keys(listed.payload).sort(), ["count", "data", "page", "success", "total", "totalPages"]);
    assert.equal(listed.payload.count, 1);
    assert.equal(listed.payload.total, 1);
    assert.equal(listed.payload.page, 1);
    assert.equal(listed.payload.totalPages, 1);
    assert.equal(String(listed.payload.data[0]._id), String(supplierId));
  });

  await t.test("detail populates original createdBy and updatedBy projections", async () => {
    const detail = response();
    await getSupplierById({ params: { id: String(supplierId) } }, detail);
    assert.equal(detail.payload.data.createdBy.firstName, "Supplier");
    assert.equal(detail.payload.data.updatedBy, undefined);
  });

  await t.test("update uses original findByIdAndUpdate behavior and retains nested structure", async () => {
    const updated = response();
    await updateSupplier(
      {
        params: { id: String(supplierId) },
        body: {
          displayName: "Updated Supplier",
          bankDetails: { bankName: " Updated Bank " },
          status: "on_hold",
        },
        user: accountant,
      },
      updated,
    );
    assert.equal(updated.payload.data.displayName, "Updated Supplier");
    assert.equal(updated.payload.data.bankDetails.bankName, "Updated Bank");
    assert.equal(updated.payload.data.status, "on_hold");
    assert.equal(String(updated.payload.data.updatedBy), String(accountant._id));
  });

  await t.test("Route Handlers preserve supplier authorization, validation, generated code and read access", async () => {
    const adminToken = generateToken(admin._id);
    const accountantToken = generateToken(accountant._id);
    const salesToken = generateToken(salesRep._id);

    const deniedCreate = await suppliersPostRoute(
      jsonRequest("POST", "/api/suppliers", salesToken, supplierBody()),
    );
    assert.equal(deniedCreate.status, 403);
    assert.equal((await deniedCreate.json()).message, "Role 'sales_rep' is not authorized for this action");

    const invalid = await suppliersPostRoute(
      jsonRequest("POST", "/api/suppliers", adminToken, { displayName: "" }),
    );
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).message, "Validation failed");

    await Counter.collection.updateOne(
      { _id: "supplier" },
      { $set: { sequence: 800000000 } },
      { upsert: true },
    );
    const created = await suppliersPostRoute(
      jsonRequest(
        "POST",
        "/api/suppliers",
        accountantToken,
        supplierBody({ displayName: `${prefix} route supplier`, supplierCode: "DISCARDED" }),
      ),
    );
    assert.equal(created.status, 201);
    const routeSupplier = (await created.json()).data;
    ids.suppliers.push(routeSupplier._id);
    assert.equal(routeSupplier.supplierCode, "SUP-800000001");

    const deniedUpdate = await supplierPutRoute(
      jsonRequest("PUT", `/api/suppliers/${supplierId}`, salesToken, { displayName: "Denied" }),
      { params: Promise.resolve({ id: String(supplierId) }) },
    );
    assert.equal(deniedUpdate.status, 403);

    const readable = await suppliersGetRoute(
      jsonRequest("GET", `/api/suppliers?search=${encodeURIComponent(prefix)}`, salesToken),
    );
    assert.equal(readable.status, 200);
    assert.ok((await readable.json()).data.some((supplier) => supplier._id === routeSupplier._id));

    const detail = await supplierDetailRoute(
      jsonRequest("GET", `/api/suppliers/${supplierId}`, salesToken),
      { params: Promise.resolve({ id: String(supplierId) }) },
    );
    assert.equal(detail.status, 200);

    const deniedDelete = await supplierDeleteRoute(
      jsonRequest("DELETE", `/api/suppliers/${supplierId}`, accountantToken),
      { params: Promise.resolve({ id: String(supplierId) }) },
    );
    assert.equal(deniedDelete.status, 403);
  });

  await t.test("delete soft-deletes, hides from find paths, and preserves exact response", async () => {
    const deleted = response();
    await deleteSupplier({ params: { id: String(supplierId) } }, deleted);
    assert.deepEqual(deleted.payload, { success: true, message: "Supplier deleted" });
    assert.equal(await Supplier.findById(supplierId), null);
    const stored = await Supplier.findById(supplierId).setOptions({ includeDeleted: true });
    assert.equal(stored.status, "inactive");
    assert.ok(stored.deletedAt);

    const missing = response();
    await assert.rejects(
      () => getSupplierById({ params: { id: String(supplierId) } }, missing),
      /Supplier not found/,
    );
    assert.equal(missing.statusCode, 404);
  });
});

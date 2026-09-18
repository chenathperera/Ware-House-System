import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import generateToken from "../src/server/auth/token.js";
import Customer from "../src/server/models/Customer.js";
import CustomerGroup from "../src/server/models/CustomerGroup.js";
import Counter from "../src/server/models/Counter.js";
import User from "../src/server/models/User.js";
import {
  DELETE as customerDeleteRoute,
  GET as customerDetailRoute,
  PUT as customerPutRoute,
} from "../src/app/api/customers/[id]/route.js";
import {
  GET as customersGetRoute,
  POST as customersPostRoute,
} from "../src/app/api/customers/route.js";
import { PATCH as creditHoldRoute } from "../src/app/api/customers/[id]/credit-hold/route.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  toggleCreditHold,
  updateCustomer,
} from "../src/server/services/customerService.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../src/server/validators/customerValidator.js";

const uri = "mongodb://127.0.0.1:27017/warehouse_system_next";
const prefix = `customer-parity-${randomUUID()}`;

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

function customerBody(groupId, repId, overrides = {}) {
  return {
    customerType: "company",
    businessType: "wholesaler",
    companyName: "  Synthetic Company  ",
    displayName: "  Synthetic Customer  ",
    firstName: "  Primary  ",
    lastName: "  Contact  ",
    customerGroupId: String(groupId),
    tags: [" retail ", " priority "],
    businessRegistrationNumber: "  BR-1  ",
    taxRegistrationNumber: " VAT-1 ",
    industry: "  Distribution ",
    primaryContact: {
      name: " Main Person ",
      email: "MAIN@EXAMPLE.INVALID",
      phone: " 0111234567 ",
      mobile: " 0771234567 ",
    },
    contacts: [
      {
        name: " Accounts Person ",
        designation: " Accountant ",
        email: "ACCOUNTS@EXAMPLE.INVALID",
        phone: " 0119999999 ",
        role: "accounts",
        isPrimary: true,
        notes: " Invoice contact ",
      },
      { name: " Delivery Person ", role: "logistics" },
    ],
    billingAddress: { line1: " Billing line ", city: " Colombo ", isDefault: true },
    shippingAddresses: [
      { label: " Main Shop ", line1: " Shop one ", isDefault: true },
      { label: " Branch ", line1: " Shop two ", isDefault: false },
    ],
    assignedSalesRep: String(repId),
    paymentTerms: { type: "credit", creditDays: 30, creditLimit: 1000 },
    defaultDiscountPercent: 5,
    status: "active",
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

test("Customer backend/data contract preserves original behavior", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved database");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

  const ids = { customers: [], groups: [], users: [] };
  const counterBefore = await Counter.collection.findOne({ _id: "customer" });

  t.after(async () => {
    try {
      for (const id of ids.customers) {
        await Customer.collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
      }
      for (const id of ids.groups) await CustomerGroup.collection.deleteOne({ _id: id });
      for (const id of ids.users) await User.collection.deleteOne({ _id: id });
      if (counterBefore) {
        await Counter.collection.replaceOne({ _id: "customer" }, counterBefore, { upsert: true });
      } else {
        await Counter.collection.deleteOne({ _id: "customer" });
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  const admin = await User.create({
    firstName: "Customer",
    lastName: "Admin",
    email: `${prefix}-admin@example.invalid`,
    password: "SyntheticPass9",
    role: "admin",
  });
  const salesRep = await User.create({
    firstName: "Customer",
    lastName: "Sales",
    email: `${prefix}-sales@example.invalid`,
    password: "SyntheticPass9",
    role: "sales_rep",
  });
  const accountant = await User.create({
    firstName: "Customer",
    lastName: "Accounts",
    email: `${prefix}-accounts@example.invalid`,
    password: "SyntheticPass9",
    role: "accountant",
  });
  const staff = await User.create({
    firstName: "Customer",
    lastName: "Staff",
    email: `${prefix}-staff@example.invalid`,
    password: "SyntheticPass9",
    role: "staff",
  });
  ids.users.push(admin._id, salesRep._id, accountant._id, staff._id);

  const group = await CustomerGroup.create({
    name: `${prefix} group`,
    code: prefix.replaceAll("-", "").slice(0, 20),
    color: "#123456",
    defaultDiscountPercent: 10,
  });
  ids.groups.push(group._id);

  await t.test("validator retains the original nested request contract and stripping", () => {
    const parsed = createCustomerSchema.parse(
      customerBody(group._id, salesRep._id, {
        customerCode: "OVERRIDE",
        creditStatus: { currentBalance: 10 },
        analytics: { totalOrders: 99 },
      }),
    );
    assert.equal("customerCode" in parsed, false);
    assert.equal("creditStatus" in parsed, false);
    assert.equal("analytics" in parsed, false);
    assert.equal(createCustomerSchema.safeParse({ displayName: "" }).success, false);
    assert.equal(
      createCustomerSchema.safeParse(customerBody(group._id, salesRep._id, { customerGroupId: "bad" }))
        .success,
      false,
    );
    assert.deepEqual(updateCustomerSchema.parse({}), {});
  });

  let customerId;
  await t.test("create preserves nested persistence, defaults, generated code, population, and available credit", async () => {
    const created = response();
    await createCustomer({ body: customerBody(group._id, salesRep._id), user: admin }, created);

    assert.equal(created.statusCode, 201);
    const data = created.payload.data;
    customerId = data._id;
    ids.customers.push(customerId);
    assert.match(data.customerCode, /^CUST-\d+$/);
    assert.equal(data.companyName, "Synthetic Company");
    assert.equal(data.primaryContact.email, "main@example.invalid");
    assert.equal(data.contacts[0].email, "accounts@example.invalid");
    assert.equal(data.contacts[0].role, "accounts");
    assert.equal(data.contacts[0].isPrimary, true);
    assert.equal(data.shippingAddresses.length, 2);
    assert.equal(data.shippingAddresses[0].isDefault, true);
    assert.equal(data.billingAddress.country, "Sri Lanka");
    assert.equal(data.paymentTerms.creditLimit, 1000);
    assert.equal(data.creditStatus.availableCredit, 1000);
    assert.equal(data.creditStatus.onCreditHold, false);
    assert.equal(data.customerGroupId.name, group.name);
    assert.equal(data.assignedSalesRep.firstName, "Customer");
  });

  await t.test("available credit is a pre-save calculation, not a route-level accounting feature", async () => {
    const customer = await Customer.create({
      displayName: `${prefix} credit boundary`,
      paymentTerms: { creditLimit: 100 },
      creditStatus: { currentBalance: 125 },
    });
    ids.customers.push(customer._id);
    assert.equal(customer.creditStatus.availableCredit, 0);
    customer.paymentTerms.creditLimit = 150;
    await customer.save();
    assert.equal(customer.creditStatus.availableCredit, 25);
  });

  await t.test("list preserves original filters, population, pagination and response envelope", async () => {
    const listed = response();
    await getCustomers(
      {
        query: {
          search: "0111234567",
          customerGroupId: String(group._id),
          status: "active",
          assignedSalesRep: String(salesRep._id),
          onCreditHold: "false",
          isOverdue: "false",
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
    assert.equal(String(listed.payload.data[0]._id), String(customerId));
    assert.equal(listed.payload.data[0].customerGroupId.color, "#123456");
  });

  await t.test("detail populates group, sales representative, creator, and updater contracts", async () => {
    const detail = response();
    await getCustomerById({ params: { id: customerId } }, detail);
    assert.equal(detail.payload.data.customerGroupId.defaultDiscountPercent, 10);
    assert.equal(detail.payload.data.assignedSalesRep.email, salesRep.email);
    assert.equal(detail.payload.data.createdBy.firstName, "Customer");
    assert.equal(detail.payload.data.updatedBy, undefined);
  });

  await t.test("update keeps the original findByIdAndUpdate hook bypass and empty-reference semantics", async () => {
    const updated = response();
    await updateCustomer(
      {
        params: { id: customerId },
        body: {
          displayName: "Updated Customer",
          customerGroupId: "",
          assignedSalesRep: "",
          paymentTerms: { type: "credit", creditDays: 45, creditLimit: 300 },
        },
        user: salesRep,
      },
      updated,
    );
    assert.equal(updated.payload.data.displayName, "Updated Customer");
    assert.equal(updated.payload.data.customerGroupId, null);
    assert.equal(updated.payload.data.assignedSalesRep, null);
    // Original update uses findByIdAndUpdate, so its pre-save credit calculation does not run.
    assert.equal(updated.payload.data.creditStatus.availableCredit, 1000);
  });

  await t.test("credit hold toggles without a reason requirement, clears on release, and recalculates on save", async () => {
    const held = response();
    await toggleCreditHold({ params: { id: customerId }, body: { reason: "  Limit exceeded " } }, held);
    assert.equal(held.payload.message, "Customer placed on credit hold");
    assert.equal(held.payload.data.creditStatus.onCreditHold, true);
    assert.equal(held.payload.data.creditStatus.creditHoldReason, "Limit exceeded");
    // The save invoked by the hold action runs the original available-credit hook.
    assert.equal(held.payload.data.creditStatus.availableCredit, 300);

    const released = response();
    await toggleCreditHold({ params: { id: customerId }, body: {} }, released);
    assert.equal(released.payload.message, "Credit hold removed");
    assert.equal(released.payload.data.creditStatus.onCreditHold, false);
    assert.equal(released.payload.data.creditStatus.creditHoldReason, null);
  });

  await t.test("Route Handlers preserve Customer authorization, validation, and endpoint access", async () => {
    const adminToken = generateToken(admin._id);
    const salesToken = generateToken(salesRep._id);
    const accountantToken = generateToken(accountant._id);
    const staffToken = generateToken(staff._id);

    const deniedCreate = await customersPostRoute(
      jsonRequest("POST", "/api/customers", staffToken, customerBody(group._id, salesRep._id)),
    );
    assert.equal(deniedCreate.status, 403);
    assert.equal((await deniedCreate.json()).message, "Role 'staff' is not authorized for this action");

    const invalidCreate = await customersPostRoute(
      jsonRequest("POST", "/api/customers", adminToken, { displayName: "" }),
    );
    assert.equal(invalidCreate.status, 400);
    assert.equal((await invalidCreate.json()).message, "Validation failed");

    await Counter.collection.updateOne(
      { _id: "customer" },
      { $set: { sequence: 700000000 } },
      { upsert: true },
    );
    const created = await customersPostRoute(
      jsonRequest(
        "POST",
        "/api/customers",
        salesToken,
        customerBody(group._id, salesRep._id, {
          displayName: `${prefix} route customer`,
          customerCode: "DISCARDED",
          creditStatus: { currentBalance: 1 },
        }),
      ),
    );
    assert.equal(created.status, 201);
    const routeCustomer = (await created.json()).data;
    ids.customers.push(routeCustomer._id);
    assert.match(routeCustomer.customerCode, /^CUST-700000001$/);
    assert.equal(routeCustomer.creditStatus.currentBalance, 0);

    const deniedUpdate = await customerPutRoute(
      jsonRequest("PUT", `/api/customers/${customerId}`, staffToken, { displayName: "Denied" }),
      { params: Promise.resolve({ id: customerId }) },
    );
    assert.equal(deniedUpdate.status, 403);

    const heldByAccountant = await creditHoldRoute(
      jsonRequest("PATCH", `/api/customers/${customerId}/credit-hold`, accountantToken, {}),
      { params: Promise.resolve({ id: customerId }) },
    );
    assert.equal(heldByAccountant.status, 200);

    const deniedHold = await creditHoldRoute(
      jsonRequest("PATCH", `/api/customers/${customerId}/credit-hold`, salesToken, {}),
      { params: Promise.resolve({ id: customerId }) },
    );
    assert.equal(deniedHold.status, 403);

    const readable = await customersGetRoute(
      jsonRequest("GET", `/api/customers?search=${encodeURIComponent(prefix)} `, staffToken),
    );
    assert.equal(readable.status, 200);
    assert.ok((await readable.json()).data.some((customer) => customer._id === routeCustomer._id));

    const detail = await customerDetailRoute(
      jsonRequest("GET", `/api/customers/${customerId}`, staffToken),
      { params: Promise.resolve({ id: customerId }) },
    );
    assert.equal(detail.status, 200);

    const deniedDelete = await customerDeleteRoute(
      jsonRequest("DELETE", `/api/customers/${customerId}`, salesToken),
      { params: Promise.resolve({ id: customerId }) },
    );
    assert.equal(deniedDelete.status, 403);
  });

  await t.test("delete soft-deletes, hides Customer from every find path, and preserves the exact response", async () => {
    const deleted = response();
    await deleteCustomer({ params: { id: customerId } }, deleted);
    assert.deepEqual(deleted.payload, { success: true, message: "Customer deleted" });
    assert.equal(await Customer.findById(customerId), null);
    const stored = await Customer.findById(customerId).setOptions({ includeDeleted: true });
    assert.equal(stored.status, "inactive");
    assert.ok(stored.deletedAt);

    const missing = response();
    await assert.rejects(
      () => getCustomerById({ params: { id: customerId } }, missing),
      /Customer not found/,
    );
    assert.equal(missing.statusCode, 404);
  });
});

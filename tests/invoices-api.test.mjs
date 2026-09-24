import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import Customer from "../src/server/models/Customer.js";
import Invoice from "../src/server/models/Invoice.js";
import User from "../src/server/models/User.js";
import { GET as list, POST as create } from "../src/app/api/invoices/route.js";
import { GET as detail } from "../src/app/api/invoices/[id]/route.js";
import { PATCH as status } from "../src/app/api/invoices/[id]/status/route.js";

const uri =
  "mongodb://127.0.0.1:27018/warehouse_system_invoice_test?replicaSet=stockTestRs";

function request(method, path, user, body) {
  return new Request(`http://invoices.test${path}`, {
    method,
    headers: {
      ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function call(handler, path, options = {}) {
  const response = await handler(
    request(options.method || "GET", path, options.user, options.body),
    { params: Promise.resolve(options.params || {}) },
  );
  return { status: response.status, body: await response.json() };
}

test("Invoice source model and manual API contract", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const ids = { invoices: [], customers: [], users: [] };
  t.after(async () => {
    await Invoice.collection.deleteMany({ _id: { $in: ids.invoices } });
    await Customer.collection.deleteMany({ _id: { $in: ids.customers } });
    await User.collection.deleteMany({ _id: { $in: ids.users } });
    await mongoose.disconnect();
  });

  const admin = await User.create({
    firstName: "Invoice",
    lastName: "Admin",
    email: `invoice-${suffix}@example.invalid`,
    password: "Password9!",
    role: "admin",
  });
  ids.users.push(admin._id);
  const customer = await Customer.create({
    displayName: `Invoice Customer ${suffix}`,
    customerCode: `INV${suffix}`,
    paymentTerms: { type: "credit", creditDays: 10, creditLimit: 1000 },
  });
  ids.customers.push(customer._id);
  const payload = {
    customerId: String(customer._id),
    invoiceDate: "2026-01-01",
    items: [{
      productName: "Manual item",
      quantity: 2,
      unitPrice: 100,
      discountPercent: 10,
      taxRate: 18,
      taxable: true,
    }],
    shippingCost: 5,
    otherCharges: 2,
    status: "approved",
    ignoredField: "validator strips this",
  };

  await t.test("auth, roles, validator, and manual creation match source", async () => {
    assert.equal((await call(list, "/api/invoices")).status, 401);
    const created = await call(create, "/api/invoices", {
      method: "POST",
      user: admin,
      body: payload,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const invoice = created.body.data;
    ids.invoices.push(invoice._id);
    assert.match(invoice.invoiceNumber, /^INV-\d+$/);
    assert.equal(invoice.customerSnapshot.name, customer.displayName);
    assert.equal(invoice.items[0].lineSubtotal, 200);
    assert.equal(invoice.items[0].lineDiscount, 20);
    assert.equal(invoice.items[0].lineTax, 32.4);
    assert.equal(invoice.grandTotal, 219.4);
    assert.equal(invoice.balanceDue, 219.4);
    assert.equal(invoice.paymentStatus, "overdue");
    assert.equal(invoice.ignoredField, undefined);
  });

  await t.test("list, filters, detail, and status actions retain source behavior", async () => {
    const listed = await call(list, "/api/invoices?search=Invoice&page=1&limit=1", {
      user: admin,
    });
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.equal(listed.body.count, 1);
    const invoice = listed.body.data[0];
    const found = await call(detail, `/api/invoices/${invoice._id}`, {
      user: admin,
      params: { id: invoice._id },
    });
    assert.equal(found.status, 200);
    const changed = await call(status, `/api/invoices/${invoice._id}/status`, {
      method: "PATCH",
      user: admin,
      params: { id: invoice._id },
      body: { status: "sent" },
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.data.status, "sent");
  });

  await t.test("payment-ready hooks, aging, and customer balance match source", async () => {
    const invoice = await Invoice.findOne({ customerId: customer._id });
    invoice.amountPaid = 100;
    invoice.lastPaymentDate = new Date();
    await invoice.save();
    assert.equal(invoice.balanceDue, 119.4);
    assert.equal(invoice.paymentStatus, "partially_paid");
    await invoice.save();
    const partialCustomer = await Customer.findById(customer._id);
    assert.equal(partialCustomer.creditStatus.currentBalance, 219.4);
    invoice.amountPaid = invoice.grandTotal;
    await invoice.save();
    assert.equal(invoice.paymentStatus, "paid");
    assert.ok(invoice.fullyPaidAt);
    invoice.amountPaid = 0;
    await invoice.save();
    assert.equal(invoice.paymentStatus, "overdue");
  });

  await t.test("manual invoices have no stock side effects and soft-delete filter remains active", async () => {
    const invoice = await Invoice.findOne({ customerId: customer._id });
    invoice.deletedAt = new Date();
    await invoice.save();
    assert.equal(await Invoice.findById(invoice._id), null);
    assert.equal(await Invoice.collection.countDocuments({ _id: invoice._id }), 1);
  });
});

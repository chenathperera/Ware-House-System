import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Counter from "../src/server/models/Counter.js";
import CreditNote from "../src/server/models/CreditNote.js";
import Customer from "../src/server/models/Customer.js";
import Invoice from "../src/server/models/Invoice.js";
import User from "../src/server/models/User.js";
import { applyCreditNote, createCreditNote, getCreditNoteById, getCreditNotes } from "../src/server/services/creditNoteApiService.js";

const uri = "mongodb://127.0.0.1:27018/?replicaSet=stockTestRs";
const dbName = "warehouse_system_credit_notes_test";
const res = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });

test("Credit Notes preserve source creation, listing, application, and balance behavior", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved database URI");
  assert.equal(process.env.MONGODB_DB_NAME, dbName, "Refusing an unapproved database name");
  await mongoose.connect(uri, { dbName, autoIndex: false, autoCreate: false });
  const created = { customers: [], invoices: [], notes: [], users: [] };
  const add = (kind, document) => (created[kind].push(document._id), document);
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  t.after(async () => {
    try {
      await Promise.all([
        CreditNote.collection.deleteMany({ _id: { $in: created.notes } }),
        Invoice.collection.deleteMany({ _id: { $in: created.invoices } }),
        Customer.collection.deleteMany({ _id: { $in: created.customers } }),
        User.collection.deleteMany({ _id: { $in: created.users } }),
      ]);
      await Counter.collection.deleteMany({ _id: "credit_note" });
    } finally { await mongoose.disconnect(); }
  });

  const user = add("users", await User.create({ firstName: "Credit", lastName: "Tester", email: `credit-${suffix}@example.test`, password: "Password9!", role: "admin" }));
  const customer = add("customers", await Customer.create({ displayName: `Credit Customer ${suffix}`, customerCode: `CN${suffix}` }));
  const otherCustomer = add("customers", await Customer.create({ displayName: `Other Customer ${suffix}`, customerCode: `OC${suffix}` }));
  const makeInvoice = async (owner, quantity, price) => add("invoices", await Invoice.create({ customerId: owner._id, customerSnapshot: { name: owner.displayName, code: owner.customerCode }, items: [{ quantity, unitPrice: price, taxable: false }], createdBy: user._id }));
  const invoice = await makeInvoice(customer, 1, 100);
  const otherInvoice = await makeInvoice(otherCustomer, 1, 100);

  const createdResponse = res();
  await createCreditNote({ body: { customerId: String(customer._id), amount: 100, reason: "goodwill", description: "Manual credit", invoiceId: String(invoice._id) }, user }, createdResponse);
  const creditNoteId = createdResponse.body.data._id;
  created.notes.push(creditNoteId);
  assert.equal(createdResponse.statusCode, 201);
  assert.match(createdResponse.body.data.creditNoteNumber, /^CN-\d+$/);
  assert.equal(createdResponse.body.data.remainingAmount, 100);
  assert.equal(createdResponse.body.data.status, "issued");
  assert.equal(createdResponse.body.data.reason, "goodwill");

  const returnCredit = add("notes", await CreditNote.create({ customerId: customer._id, customerSnapshot: { name: customer.displayName, code: customer.customerCode }, amount: 1, customerReturnId: new mongoose.Types.ObjectId(), createdBy: user._id }));
  assert.equal(returnCredit.reason, "return");
  assert.equal(returnCredit.remainingAmount, 1);

  const listResponse = res();
  await getCreditNotes({ query: { customerId: String(customer._id), status: "issued", page: "1", limit: "1" } }, listResponse);
  assert.equal(listResponse.body.total, 2);
  assert.equal(listResponse.body.data.length, 1);
  assert.equal(listResponse.body.totalPages, 2);
  const detailResponse = res();
  await getCreditNoteById({ params: { id: creditNoteId } }, detailResponse);
  assert.equal(String(detailResponse.body.data.customerId._id), String(customer._id));

  await applyCreditNote({ params: { id: creditNoteId }, body: { invoiceId: String(invoice._id), amount: 40 }, user }, res());
  let creditNote = await CreditNote.findById(creditNoteId);
  let storedInvoice = await Invoice.findById(invoice._id);
  assert.equal(creditNote.remainingAmount, 60);
  assert.equal(creditNote.status, "partially_applied");
  assert.equal(storedInvoice.amountPaid, 40);
  assert.equal(storedInvoice.balanceDue, 60);

  await applyCreditNote({ params: { id: creditNoteId }, body: { invoiceId: String(invoice._id), amount: 60 }, user }, res());
  creditNote = await CreditNote.findById(creditNoteId);
  storedInvoice = await Invoice.findById(invoice._id);
  assert.equal(creditNote.remainingAmount, 0);
  assert.equal(creditNote.status, "fully_applied");
  assert.equal(storedInvoice.amountPaid, 100);
  assert.equal(storedInvoice.balanceDue, 0);

  const duplicate = add("notes", await CreditNote.create({ customerId: customer._id, customerSnapshot: { name: customer.displayName, code: customer.customerCode }, amount: 20, createdBy: user._id }));
  const duplicateInvoice = await makeInvoice(customer, 1, 20);
  await applyCreditNote({ params: { id: duplicate._id }, body: { invoiceId: String(duplicateInvoice._id), amount: 10 }, user }, res());
  await applyCreditNote({ params: { id: duplicate._id }, body: { invoiceId: String(duplicateInvoice._id), amount: 10 }, user }, res());
  assert.equal((await CreditNote.findById(duplicate._id)).applications.length, 2, "Source permits duplicate invoice applications");

  const guarded = add("notes", await CreditNote.create({ customerId: customer._id, customerSnapshot: { name: customer.displayName, code: customer.customerCode }, amount: 10, createdBy: user._id }));
  const guardedInvoice = await makeInvoice(customer, 1, 5);
  await assert.rejects(() => applyCreditNote({ params: { id: guarded._id }, body: { invoiceId: String(guardedInvoice._id), amount: 11 }, user }, res()), /remaining/);
  await assert.rejects(() => applyCreditNote({ params: { id: guarded._id }, body: { invoiceId: String(guardedInvoice._id), amount: 6 }, user }, res()), /invoice balance/);
  await assert.rejects(() => applyCreditNote({ params: { id: guarded._id }, body: { invoiceId: String(otherInvoice._id), amount: 1 }, user }, res()), /same customer/);
  assert.equal((await CreditNote.findById(guarded._id)).applications.length, 0, "Pre-transaction guards leave the credit note unchanged");
  assert.equal((await Invoice.findById(guardedInvoice._id)).amountPaid, 0);
  assert.equal((await Customer.findById(customer._id)).creditStatus.currentBalance, 0, "Balance recalculation runs after successful credit transactions, not failed pre-transaction guards");
});

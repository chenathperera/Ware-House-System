import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import BankAccount from "../src/server/models/BankAccount.js";
import Bill from "../src/server/models/Bill.js";
import Cheque from "../src/server/models/Cheque.js";
import Customer from "../src/server/models/Customer.js";
import Invoice from "../src/server/models/Invoice.js";
import Payment from "../src/server/models/Payment.js";
import Supplier from "../src/server/models/Supplier.js";
import User from "../src/server/models/User.js";
import { GET as list, POST as create } from "../src/app/api/payments/route.js";
import {
  DELETE as remove,
  GET as detail,
} from "../src/app/api/payments/[id]/route.js";

const uri =
  "mongodb://127.0.0.1:27018/warehouse_system_payment_test?replicaSet=stockTestRs";

function request(method, path, user, body) {
  return new Request(`http://payments.test${path}`, {
    method,
    headers: {
      ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function call(handler, path, options = {}) {
  const response = await handler(
    request(options.method || "GET", path, options.user, options.body),
    { params: Promise.resolve(options.params || {}) },
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

function expectStatus(result, status) {
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}

function paymentPayload(overrides = {}) {
  return {
    amount: 100,
    method: "bank_transfer",
    paymentDate: "2026-09-24",
    ...overrides,
  };
}

test("Payments preserve source model, API, allocation, reversal, and transaction behavior", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const ids = {
    bankAccounts: [],
    bills: [],
    cheques: [],
    customers: [],
    invoices: [],
    payments: [],
    suppliers: [],
    users: [],
  };
  const track = (kind, document) => {
    ids[kind].push(document._id);
    return document;
  };

  t.after(async () => {
    try {
      await Payment.collection.deleteMany({ _id: { $in: ids.payments } });
      await Cheque.collection.deleteMany({ _id: { $in: ids.cheques } });
      await Bill.collection.deleteMany({ _id: { $in: ids.bills } });
      await Invoice.collection.deleteMany({ _id: { $in: ids.invoices } });
      await BankAccount.collection.deleteMany({ _id: { $in: ids.bankAccounts } });
      await Customer.collection.deleteMany({ _id: { $in: ids.customers } });
      await Supplier.collection.deleteMany({ _id: { $in: ids.suppliers } });
      await User.collection.deleteMany({ _id: { $in: ids.users } });
    } finally {
      await mongoose.disconnect();
    }
  });

  const admin = track("users", await User.create({
    firstName: "Payment",
    lastName: "Admin",
    email: `payment-admin-${suffix}@example.invalid`,
    password: "Password9!",
    role: "admin",
  }));
  const staff = track("users", await User.create({
    firstName: "Payment",
    lastName: "Staff",
    email: `payment-staff-${suffix}@example.invalid`,
    password: "Password9!",
    role: "warehouse_staff",
  }));
  const supplier = track("suppliers", await Supplier.create({
    displayName: `Payment Supplier ${suffix}`,
    supplierCode: `PS${suffix}`,
  }));
  const customer = track("customers", await Customer.create({
    displayName: `Payment Customer ${suffix}`,
    customerCode: `PC${suffix}`,
    paymentTerms: { type: "credit", creditLimit: 1000 },
  }));
  const bankAccount = track("bankAccounts", await BankAccount.create({
    accountName: `Payment Bank ${suffix}`,
    accountNumber: `PA-${suffix}`,
    bankName: "Payment Test Bank",
    category: "received",
    currentBalance: 1000,
  }));
  const depositAccount = track("bankAccounts", await BankAccount.create({
    accountName: `Deposit Bank ${suffix}`,
    accountNumber: `PD-${suffix}`,
    bankName: "Deposit Test Bank",
    category: "received",
    currentBalance: 200,
  }));

  const createBill = async (amount) => track("bills", await Bill.create({
    supplierId: supplier._id,
    billDate: "2026-09-01",
    items: [{ productName: "Payment Bill", quantity: 1, unitPrice: amount }],
  }));
  const createInvoice = async (amount) => track("invoices", await Invoice.create({
    customerId: customer._id,
    invoiceDate: "2026-09-01",
    items: [{ productName: "Payment Invoice", quantity: 1, unitPrice: amount }],
  }));

  await t.test("model numbering, defaults, enums, allocation rounding, and soft-delete match source", async () => {
    await assert.rejects(
      new Payment({ direction: "invalid", amount: 1, method: "cash" }).validate(),
    );
    await assert.rejects(
      new Payment({ direction: "paid", amount: 1, method: "invalid" }).validate(),
    );
    await assert.rejects(
      new Payment({ direction: "paid", method: "cash" }).validate(),
    );

    const paid = track("payments", await Payment.create({
      direction: "paid",
      amount: 10.01,
      method: "cash",
      allocations: [{
        documentType: "bill",
        documentId: new mongoose.Types.ObjectId(),
        documentNumber: "BILL-SNAPSHOT",
        amount: 3.33,
      }],
    }));
    const received = track("payments", await Payment.create({
      direction: "received",
      amount: 1,
      method: "cash",
    }));

    assert.match(paid.paymentNumber, /^PAY-\d+$/);
    assert.match(received.paymentNumber, /^REC-\d+$/);
    assert.equal(paid.status, "confirmed");
    assert.equal(paid.currency, "LKR");
    assert.equal(paid.unallocatedAmount, 6.68);
    assert.equal(paid.allocations[0].documentType, "bill");

    paid.deletedAt = new Date();
    await paid.save();
    assert.equal(await Payment.findById(paid._id), null);
    assert.equal(await Payment.collection.countDocuments({ _id: paid._id }), 1);
  });

  await t.test("API authentication, write authorization, list filters, pagination, and detail match source", async () => {
    expectStatus(await call(list, "/api/payments"), 401);
    expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: staff,
      body: paymentPayload({ direction: "paid", supplierId: String(supplier._id) }),
    }), 403);

    const filtered = expectStatus(await call(
      list,
      `/api/payments?direction=paid&supplierId=${supplier._id}&page=1&limit=1`,
      { user: admin },
    ), 200);
    assert.equal(filtered.page, 1);
    assert.equal(filtered.count, 0);
    assert.equal(filtered.total, 0);
    assert.equal(filtered.totalPages, 0);
    assert.deepEqual(filtered.data, []);
  });

  await t.test("paid payments allocate Bills, snapshot numbers, update Bank, and reverse", async () => {
    const firstBill = await createBill(100);
    const secondBill = await createBill(100);
    const result = expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "paid",
        supplierId: String(supplier._id),
        bankAccountId: String(bankAccount._id),
        allocations: [
          { documentType: "bill", documentId: String(firstBill._id), amount: 60 },
          { documentType: "bill", documentId: String(secondBill._id), amount: 30 },
        ],
      }),
    }), 201).data;
    ids.payments.push(result._id);

    assert.match(result.paymentNumber, /^PAY-\d+$/);
    assert.equal(result.partyName, supplier.displayName);
    assert.equal(result.allocations[0].documentNumber, firstBill.billNumber);
    assert.equal(result.allocations[1].documentNumber, secondBill.billNumber);
    assert.equal(result.unallocatedAmount, 10);
    assert.equal((await Bill.findById(firstBill._id)).amountPaid, 60);
    assert.equal((await Bill.findById(firstBill._id)).balanceDue, 40);
    assert.equal((await Bill.findById(firstBill._id)).paymentStatus, "partially_paid");
    assert.ok((await Bill.findById(firstBill._id)).lastPaymentDate);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, 900);

    const detailResult = expectStatus(await call(detail, `/api/payments/${result._id}`, {
      user: admin,
      params: { id: result._id },
    }), 200);
    assert.equal(detailResult.data.bankAccountId.accountName, bankAccount.accountName);

    expectStatus(await call(remove, `/api/payments/${result._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: result._id },
    }), 200);
    assert.equal((await Bill.findById(firstBill._id)).amountPaid, 0);
    assert.equal((await Bill.findById(secondBill._id)).amountPaid, 0);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, 1000);
    expectStatus(await call(detail, `/api/payments/${result._id}`, {
      user: admin,
      params: { id: result._id },
    }), 404);
  });

  await t.test("paid allocation errors and transaction rollback leave no partial state", async () => {
    const bill = await createBill(100);
    const paymentCount = await Payment.collection.countDocuments();
    const result = await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "paid",
        supplierId: String(supplier._id),
        bankAccountId: String(bankAccount._id),
        allocations: [
          { documentType: "bill", documentId: String(bill._id), amount: 50 },
          { documentType: "bill", documentId: String(new mongoose.Types.ObjectId()), amount: 1 },
        ],
      }),
    });
    expectStatus(result, 400);
    assert.match(result.body.message, /Bill .* not found/);
    assert.equal(await Payment.collection.countDocuments(), paymentCount);
    assert.equal((await Bill.findById(bill._id)).amountPaid, 0);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, 1000);

    const overAllocated = await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "paid",
        supplierId: String(supplier._id),
        allocations: [{ documentType: "bill", documentId: String(bill._id), amount: 101 }],
      }),
    });
    expectStatus(overAllocated, 400);
    assert.match(overAllocated.body.message, /Cannot allocate 101/);
  });

  await t.test("received payments allocate Invoices, recalculate customers, and reverse", async () => {
    const firstInvoice = await createInvoice(100);
    const secondInvoice = await createInvoice(100);
    const result = expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "received",
        customerId: String(customer._id),
        bankAccountId: String(bankAccount._id),
        allocations: [
          { documentType: "invoice", documentId: String(firstInvoice._id), amount: 60 },
          { documentType: "invoice", documentId: String(secondInvoice._id), amount: 30 },
        ],
      }),
    }), 201).data;
    ids.payments.push(result._id);

    assert.match(result.paymentNumber, /^REC-\d+$/);
    assert.equal(result.partyName, customer.displayName);
    assert.equal(result.allocations[0].documentNumber, firstInvoice.invoiceNumber);
    assert.equal((await Invoice.findById(firstInvoice._id)).amountPaid, 60);
    assert.equal((await Invoice.findById(firstInvoice._id)).balanceDue, 40);
    assert.equal((await Invoice.findById(firstInvoice._id)).paymentStatus, "partially_paid");
    assert.ok((await Invoice.findById(firstInvoice._id)).lastPaymentDate);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, 1100);
    assert.equal((await Customer.findById(customer._id)).creditStatus.currentBalance, 110);

    expectStatus(await call(remove, `/api/payments/${result._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: result._id },
    }), 200);
    assert.equal((await Invoice.findById(firstInvoice._id)).amountPaid, 0);
    assert.equal((await Invoice.findById(secondInvoice._id)).amountPaid, 0);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, 1000);
    assert.equal((await Customer.findById(customer._id)).creditStatus.currentBalance, 200);
  });

  await t.test("received validation, rollback, Cheque linkage, and bank deletion asymmetry match source", async () => {
    expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({ direction: "received" }),
    }), 400);

    const invoice = await createInvoice(100);
    const missingInvoice = await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "received",
        customerId: String(customer._id),
        allocations: [{
          documentType: "invoice",
          documentId: String(new mongoose.Types.ObjectId()),
          amount: 1,
        }],
      }),
    });
    expectStatus(missingInvoice, 400);
    assert.match(missingInvoice.body.message, /Invoice .* not found/);

    const overAllocated = await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "received",
        customerId: String(customer._id),
        allocations: [{
          documentType: "invoice",
          documentId: String(invoice._id),
          amount: 101,
        }],
      }),
    });
    expectStatus(overAllocated, 400);
    assert.match(overAllocated.body.message, /Cannot allocate 101/);

    const duplicateCheque = track("cheques", await Cheque.create({
      chequeNumber: `DUP-${suffix}`,
      chequeDate: "2026-09-24",
      amount: 100,
      bankName: "Duplicate Bank",
      direction: "incoming",
    }));
    const paymentCount = await Payment.collection.countDocuments();
    const failedCheque = await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "received",
        customerId: String(customer._id),
        method: "cheque",
        chequeNumber: duplicateCheque.chequeNumber,
        chequeDate: "2026-09-24",
        bankName: duplicateCheque.bankName,
        allocations: [{ documentType: "invoice", documentId: String(invoice._id), amount: 50 }],
      }),
    });
    expectStatus(failedCheque, 400);
    assert.equal(await Payment.collection.countDocuments(), paymentCount);
    assert.equal((await Invoice.findById(invoice._id)).amountPaid, 0);
    assert.equal((await Customer.findById(customer._id)).creditStatus.currentBalance, 200);

    const chequeResult = expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "received",
        customerId: String(customer._id),
        method: "cheque",
        chequeNumber: `PAY-${suffix}`,
        chequeDate: "2026-09-24",
        bankName: "Cheque Bank",
        bankAccountId: String(bankAccount._id),
        allocations: [{ documentType: "invoice", documentId: String(invoice._id), amount: 100 }],
      }),
    }), 201).data;
    ids.payments.push(chequeResult._id);
    const cheque = await Cheque.findOne({ paymentId: chequeResult._id });
    ids.cheques.push(cheque._id);
    assert.equal(cheque.direction, "incoming");
    assert.equal(cheque.customerId.toString(), customer._id.toString());
    assert.equal(cheque.payeeName, customer.displayName);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, 1000);

    cheque.status = "cleared";
    cheque.depositedBankAccountId = depositAccount._id;
    await cheque.save();
    expectStatus(await call(remove, `/api/payments/${chequeResult._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: chequeResult._id },
    }), 200);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, 900);
    assert.equal((await BankAccount.findById(depositAccount._id)).currentBalance, 100);
    assert.equal((await Cheque.collection.findOne({ _id: cheque._id })).status, "cancelled");
    assert.ok((await Cheque.collection.findOne({ _id: cheque._id })).deletedAt);
  });

  await t.test("Bank Account method effects and source deletion asymmetry match source", async () => {
    const initialBalance = (await BankAccount.findById(bankAccount._id)).currentBalance;
    const cardPayment = expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "paid",
        supplierId: String(supplier._id),
        method: "card",
        bankAccountId: String(bankAccount._id),
      }),
    }), 201).data;
    ids.payments.push(cardPayment._id);
    assert.equal(
      (await BankAccount.findById(bankAccount._id)).currentBalance,
      initialBalance - 100,
    );
    expectStatus(await call(remove, `/api/payments/${cardPayment._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: cardPayment._id },
    }), 200);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, initialBalance);

    const walletPayment = expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "received",
        customerId: String(customer._id),
        method: "mobile_wallet",
        bankAccountId: String(bankAccount._id),
      }),
    }), 201).data;
    ids.payments.push(walletPayment._id);
    assert.equal(
      (await BankAccount.findById(bankAccount._id)).currentBalance,
      initialBalance + 100,
    );
    expectStatus(await call(remove, `/api/payments/${walletPayment._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: walletPayment._id },
    }), 200);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, initialBalance);

    const cashPayment = expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "paid",
        supplierId: String(supplier._id),
        method: "cash",
        bankAccountId: String(bankAccount._id),
      }),
    }), 201).data;
    ids.payments.push(cashPayment._id);
    assert.equal((await BankAccount.findById(bankAccount._id)).currentBalance, initialBalance);
    expectStatus(await call(remove, `/api/payments/${cashPayment._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: cashPayment._id },
    }), 200);
    assert.equal(
      (await BankAccount.findById(bankAccount._id)).currentBalance,
      initialBalance + 100,
    );
  });

  await t.test("payment list source filters include customer, supplier, document, method, status, and dates", async () => {
    const bill = await createBill(100);
    const created = expectStatus(await call(create, "/api/payments", {
      method: "POST",
      user: admin,
      body: paymentPayload({
        direction: "paid",
        supplierId: String(supplier._id),
        method: "card",
        status: "pending",
        allocations: [{ documentType: "bill", documentId: String(bill._id), amount: 10 }],
      }),
    }), 201).data;
    ids.payments.push(created._id);
    const query = new URLSearchParams({
      direction: "paid",
      supplierId: String(supplier._id),
      documentId: String(bill._id),
      method: "card",
      status: "pending",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      page: "1",
      limit: "20",
    });
    const listed = expectStatus(await call(list, `/api/payments?${query}`, {
      user: admin,
    }), 200);
    assert.equal(listed.count, 1);
    assert.equal(listed.data[0]._id, created._id);
  });
});

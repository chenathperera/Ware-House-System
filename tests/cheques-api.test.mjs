import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import { GET as list, POST as create } from "../src/app/api/cheques/route.js";
import { PUT as updateStatus } from "../src/app/api/cheques/[id]/status/route.js";
import { DELETE as removePayment } from "../src/app/api/payments/[id]/route.js";
import { POST as createPayment } from "../src/app/api/payments/route.js";
import BankAccount from "../src/server/models/BankAccount.js";
import Cheque from "../src/server/models/Cheque.js";
import Customer from "../src/server/models/Customer.js";
import Payment from "../src/server/models/Payment.js";
import User from "../src/server/models/User.js";

const uri =
  "mongodb://127.0.0.1:27018/warehouse_system_cheques_test?replicaSet=stockTestRs";

function request(method, path, user, body) {
  return new Request(`http://cheques.test${path}`, {
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

function expectStatus(result, status, message) {
  assert.equal(result.status, status, JSON.stringify(result.body));

  if (message) {
    assert.equal(result.body.message, message);
  }

  return result.body;
}

function chequePayload(overrides = {}) {
  return {
    chequeNumber: "CHQ-100",
    chequeDate: "2026-09-24",
    amount: 125.5,
    bankName: "Cheque Test Bank",
    branchName: "Main",
    payeeName: "Cheque Party",
    direction: "incoming",
    ...overrides,
  };
}

test("Cheque Registry preserves source model, lifecycle, Payment integration, and bank effects", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);

  t.after(async () => {
    try {
      await Payment.collection.deleteMany({});
      await Cheque.collection.deleteMany({});
      await BankAccount.collection.deleteMany({});
      await Customer.collection.deleteMany({});
      await User.collection.deleteMany({});
    } finally {
      await mongoose.disconnect();
    }
  });

  await Payment.collection.deleteMany({});
  await Cheque.collection.deleteMany({});
  await BankAccount.collection.deleteMany({});
  await Customer.collection.deleteMany({});
  await User.collection.deleteMany({});

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const admin = await User.create({
    firstName: "Cheque",
    lastName: "Admin",
    email: `cheque-admin-${suffix}@example.invalid`,
    password: "Password9!",
    role: "admin",
  });
  const staff = await User.create({
    firstName: "Cheque",
    lastName: "Staff",
    email: `cheque-staff-${suffix}@example.invalid`,
    password: "Password9!",
    role: "staff",
  });
  const customer = await Customer.create({
    displayName: `Cheque Customer ${suffix}`,
    customerCode: `CHEQUE${suffix}`,
  });
  const depositAccount = await BankAccount.create({
    accountName: `Deposit ${suffix}`,
    accountNumber: `CHEQUE-DEP-${suffix}`,
    bankName: "Deposit Test Bank",
    category: "received",
    currentBalance: 1000,
  });

  await t.test("schema contract, authentication, manual creation, list filters, and population match source", async () => {
    await assert.rejects(new Cheque({}).validate());
    await assert.rejects(
      new Cheque({
        chequeNumber: "INVALID",
        chequeDate: new Date(),
        amount: 1,
        direction: "internal",
      }).validate(),
    );

    expectStatus(await call(list, "/api/cheques"), 401);
    const created = expectStatus(
      await call(create, "/api/cheques", {
        method: "POST",
        user: staff,
        body: chequePayload({ customerId: String(customer._id) }),
      }),
      201,
    ).data;
    assert.equal(created.createdBy, staff._id.toString());

    const listed = expectStatus(
      await call(
        list,
        "/api/cheques?status=pending&direction=incoming&search=Cheque%20Test&page=1&limit=1",
        { user: admin },
      ),
      200,
    );
    assert.equal(listed.total, 1);
    assert.equal(listed.page, 1);
    assert.equal(listed.totalPages, 1);
    assert.equal(listed.data[0].customerId.displayName, customer.displayName);

    const duplicate = await call(create, "/api/cheques", {
      method: "POST",
      user: admin,
      body: chequePayload(),
    });
    expectStatus(duplicate, 400);
  });

  await t.test("status transitions preserve source one-way clearing and non-transactional bank effects", async () => {
    const cheque = await Cheque.findOne({ chequeNumber: "CHQ-100" });

    const cleared = expectStatus(
      await call(updateStatus, `/api/cheques/${cheque._id}/status`, {
        method: "PUT",
        user: staff,
        params: { id: cheque._id },
        body: {
          status: "cleared",
          clearedDate: "2026-09-25",
          depositedBankAccountId: String(depositAccount._id),
        },
      }),
      200,
    ).data;
    assert.equal(cleared.status, "cleared");
    assert.equal(
      (await BankAccount.findById(depositAccount._id)).currentBalance,
      1125.5,
    );

    expectStatus(
      await call(updateStatus, `/api/cheques/${cheque._id}/status`, {
        method: "PUT",
        user: admin,
        params: { id: cheque._id },
        body: {
          status: "cleared",
          depositedBankAccountId: String(depositAccount._id),
        },
      }),
      200,
    );
    assert.equal(
      (await BankAccount.findById(depositAccount._id)).currentBalance,
      1125.5,
    );

    expectStatus(
      await call(updateStatus, `/api/cheques/${cheque._id}/status`, {
        method: "PUT",
        user: admin,
        params: { id: cheque._id },
        body: { status: "bounced", bouncedReason: "Source behavior" },
      }),
      200,
    );
    assert.equal(
      (await BankAccount.findById(depositAccount._id)).currentBalance,
      1125.5,
    );

    expectStatus(
      await call(updateStatus, "/api/cheques/not-an-id/status", {
        method: "PUT",
        user: admin,
        params: { id: new mongoose.Types.ObjectId() },
        body: { status: "pending" },
      }),
      404,
      "Cheque not found",
    );
  });

  await t.test("cheque Payments create linked records and Payment deletion cancels and reverses cleared cheques", async () => {
    const payment = expectStatus(
      await call(createPayment, "/api/payments", {
        method: "POST",
        user: admin,
        body: {
          direction: "received",
          customerId: String(customer._id),
          amount: 200,
          method: "cheque",
          chequeNumber: `PAY-CHEQUE-${suffix}`,
          chequeDate: "2026-09-24",
          bankName: "Payment Cheque Bank",
        },
      }),
      201,
    ).data;
    const linkedCheque = await Cheque.findOne({ paymentId: payment._id });
    assert.equal(linkedCheque.direction, "incoming");
    assert.equal(linkedCheque.status, "pending");
    assert.equal(linkedCheque.payeeName, customer.displayName);

    expectStatus(
      await call(updateStatus, `/api/cheques/${linkedCheque._id}/status`, {
        method: "PUT",
        user: admin,
        params: { id: linkedCheque._id },
        body: {
          status: "cleared",
          depositedBankAccountId: String(depositAccount._id),
        },
      }),
      200,
    );
    assert.equal(
      (await BankAccount.findById(depositAccount._id)).currentBalance,
      1325.5,
    );

    expectStatus(
      await call(removePayment, `/api/payments/${payment._id}`, {
        method: "DELETE",
        user: admin,
        params: { id: payment._id },
      }),
      200,
      "Payment deleted and effects reversed",
    );
    assert.equal(
      (await BankAccount.findById(depositAccount._id)).currentBalance,
      1125.5,
    );
    const removedCheque = await Cheque.collection.findOne({
      _id: linkedCheque._id,
    });
    assert.equal(removedCheque.status, "cancelled");
    assert.ok(removedCheque.deletedAt);
  });
});

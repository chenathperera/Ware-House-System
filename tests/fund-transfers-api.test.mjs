import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import { DELETE as remove } from "../src/app/api/fund-transfers/[id]/route.js";
import {
  GET as list,
  POST as create,
} from "../src/app/api/fund-transfers/route.js";
import BankAccount from "../src/server/models/BankAccount.js";
import Counter from "../src/server/models/Counter.js";
import FundTransfer from "../src/server/models/FundTransfer.js";
import User from "../src/server/models/User.js";

const uri =
  "mongodb://127.0.0.1:27018/warehouse_system_fund_transfers_test?replicaSet=stockTestRs";

function request(method, path, user, body) {
  return new Request(`http://fund-transfers.test${path}`, {
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

test("Fund Transfers preserve source model, API, transactions, and reversals", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);

  t.after(async () => {
    try {
      await FundTransfer.collection.deleteMany({});
      await BankAccount.collection.deleteMany({});
      await Counter.collection.deleteMany({ _id: "fund_transfer" });
      await User.collection.deleteMany({});
    } finally {
      await mongoose.disconnect();
    }
  });

  await FundTransfer.collection.deleteMany({});
  await BankAccount.collection.deleteMany({});
  await Counter.collection.deleteMany({ _id: "fund_transfer" });
  await User.collection.deleteMany({});

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const admin = await User.create({
    firstName: "Transfer",
    lastName: "Admin",
    email: `transfer-admin-${suffix}@example.invalid`,
    password: "Password9!",
    role: "admin",
  });
  const staff = await User.create({
    firstName: "Transfer",
    lastName: "Staff",
    email: `transfer-staff-${suffix}@example.invalid`,
    password: "Password9!",
    role: "staff",
  });
  const source = await BankAccount.create({
    accountName: `Source ${suffix}`,
    accountNumber: `SOURCE-${suffix}`,
    bankName: "Transfer Test Bank",
    category: "payment",
    currentBalance: 1000,
  });
  const destination = await BankAccount.create({
    accountName: `Destination ${suffix}`,
    accountNumber: `DESTINATION-${suffix}`,
    bankName: "Transfer Test Bank",
    category: "saving",
    currentBalance: 250,
  });

  const payload = {
    fromBankAccountId: String(source._id),
    toBankAccountId: String(destination._id),
    amount: 125.5,
    reference: "Move funds",
    notes: "Source-compatible transfer",
  };

  await t.test("schema defaults, numbering, validation, and soft deletion match source", async () => {
    await assert.rejects(new FundTransfer({}).validate());
    await assert.rejects(
      new FundTransfer({
        fromBankAccountId: source._id,
        toBankAccountId: destination._id,
        amount: 0,
      }).validate(),
    );

    const transfer = await FundTransfer.create({
      fromBankAccountId: source._id,
      toBankAccountId: destination._id,
      amount: 1,
    });
    assert.match(transfer.transferNumber, /^TRF-\d+$/);
    assert.equal(transfer.currency, "LKR");
    assert.equal(transfer.status, "completed");

    transfer.deletedAt = new Date();
    await transfer.save();
    assert.equal(await FundTransfer.findById(transfer._id), null);
    assert.equal(
      await FundTransfer.collection.countDocuments({ _id: transfer._id }),
      1,
    );
  });

  await t.test("authentication, create validation, account checks, and transaction balances match source", async () => {
    expectStatus(await call(list, "/api/fund-transfers"), 401);
    expectStatus(
      await call(create, "/api/fund-transfers", {
        method: "POST",
        user: staff,
        body: payload,
      }),
      201,
    );

    assert.equal((await BankAccount.findById(source._id)).currentBalance, 874.5);
    assert.equal(
      (await BankAccount.findById(destination._id)).currentBalance,
      375.5,
    );

    expectStatus(
      await call(create, "/api/fund-transfers", {
        method: "POST",
        user: admin,
        body: { ...payload, toBankAccountId: payload.fromBankAccountId },
      }),
      400,
      "Source and destination accounts must be different",
    );
    expectStatus(
      await call(create, "/api/fund-transfers", {
        method: "POST",
        user: admin,
        body: { ...payload, amount: 9999 },
      }),
      400,
      "Insufficient balance in source account",
    );
    assert.equal((await BankAccount.findById(source._id)).currentBalance, 874.5);
    assert.equal(
      (await BankAccount.findById(destination._id)).currentBalance,
      375.5,
    );
  });

  await t.test("list population and delete reversal match source", async () => {
    const listed = expectStatus(
      await call(list, "/api/fund-transfers", { user: admin }),
      200,
    );
    const transfer = listed.data.find(
      (item) => item.reference === "Move funds",
    );

    assert.ok(transfer);
    assert.equal(transfer.fromBankAccountId.accountName, source.accountName);
    assert.equal(transfer.toBankAccountId.accountName, destination.accountName);

    expectStatus(
      await call(remove, `/api/fund-transfers/${transfer._id}`, {
        method: "DELETE",
        user: staff,
        params: { id: transfer._id },
      }),
      200,
      "Transfer reversed",
    );
    assert.equal((await BankAccount.findById(source._id)).currentBalance, 1000);
    assert.equal(
      (await BankAccount.findById(destination._id)).currentBalance,
      250,
    );
    assert.equal(await FundTransfer.findById(transfer._id), null);
    expectStatus(
      await call(remove, `/api/fund-transfers/${transfer._id}`, {
        method: "DELETE",
        user: admin,
        params: { id: transfer._id },
      }),
      400,
      "Transfer not found",
    );
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import BankAccount from "../src/server/models/BankAccount.js";
import User from "../src/server/models/User.js";
import { GET as list, POST as create } from "../src/app/api/bank-accounts/route.js";
import {
  DELETE as remove,
  GET as detail,
  PUT as update,
} from "../src/app/api/bank-accounts/[id]/route.js";

const testUri = "mongodb://127.0.0.1:27018/warehouse_system_bank_accounts_test?replicaSet=stockTestRs";

function request(method, path, user, body) {
  return new Request(`http://bank-accounts.test${path}`, {
    method,
    headers: {
      ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function call(handler, path, { method = "GET", user, body, params = {} } = {}) {
  const response = await handler(request(method, path, user, body), {
    params: Promise.resolve(params),
  });
  return { status: response.status, body: await response.json() };
}

function expect(result, status, message) {
  assert.equal(result.status, status, JSON.stringify(result.body));
  if (message) assert.equal(result.body.message, message);
  return result.body;
}

test("Bank Accounts preserve source model, authenticated CRUD, filters, and physical deletion", async (t) => {
  assert.equal(process.env.MONGODB_URI, testUri);
  await mongoose.connect(testUri);

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const ids = { accounts: [], users: [] };
  const track = (kind, value) => {
    ids[kind].push(value._id);
    return value;
  };

  t.after(async () => {
    try {
      await BankAccount.collection.deleteMany({ _id: { $in: ids.accounts } });
      await User.collection.deleteMany({ _id: { $in: ids.users } });
    } finally {
      await mongoose.disconnect();
    }
  });

  const admin = track("users", await User.create({
    firstName: "Bank",
    lastName: "Admin",
    email: `bank-admin-${suffix}@example.invalid`,
    password: "Password9!",
    role: "admin",
  }));
  const staff = track("users", await User.create({
    firstName: "Bank",
    lastName: "Staff",
    email: `bank-staff-${suffix}@example.invalid`,
    password: "Password9!",
    role: "warehouse_staff",
  }));
  const payload = {
    accountName: `Zeta Account ${suffix}`,
    accountNumber: `BA-${suffix}`,
    bankName: "Bank of Ceylon",
    branchName: "Colombo Main",
    category: "received",
  };

  await t.test("model defaults, required fields, unique account number, and enum match source", async () => {
    const defaults = new BankAccount({ ...payload, accountNumber: `MODEL-${suffix}` });
    assert.equal(defaults.currentBalance, 0);
    assert.equal(defaults.currency, "LKR");
    assert.equal(defaults.isActive, true);
    assert.equal(defaults.deletedAt, null);
    await assert.rejects(
      () => BankAccount.create({ accountNumber: `MISSING-${suffix}` }),
      /required/,
    );
    await assert.rejects(
      () => BankAccount.create({ ...payload, accountNumber: `ENUM-${suffix}`, category: "cash" }),
      /not a valid enum value/,
    );
  });

  await t.test("authentication and source-unrestricted write roles match routes", async () => {
    expect(await call(list, "/api/bank-accounts"), 401, "Not authorized, no token provided");
    const created = expect(await call(create, "/api/bank-accounts", {
      method: "POST",
      user: staff,
      body: payload,
    }), 201).data;
    ids.accounts.push(created._id);
    assert.equal(created.createdBy, String(staff._id));
    assert.equal(created.currentBalance, 0);
    assert.equal(created.currency, "LKR");
    assert.equal(created.isActive, true);
  });

  await t.test("create, list sorting, category and active filters retain source shapes", async () => {
    const first = await BankAccount.findOne({ accountNumber: payload.accountNumber });
    const second = track("accounts", await BankAccount.create({
      ...payload,
      accountName: `Alpha Account ${suffix}`,
      accountNumber: `SECOND-${suffix}`,
      category: "payment",
      currentBalance: 125,
      isActive: false,
    }));
    ids.accounts.push(first._id);
    expect(await call(create, "/api/bank-accounts", {
      method: "POST",
      user: admin,
      body: payload,
    }), 400, `Duplicate accountNumber: ${payload.accountNumber} already exists`);
    const all = expect(await call(list, "/api/bank-accounts", { user: admin }), 200);
    assert.deepEqual(all.data.map((account) => account.accountName), [second.accountName, first.accountName]);
    const received = expect(await call(list, "/api/bank-accounts?category=received", { user: admin }), 200);
    assert.deepEqual(received.data.map((account) => account._id), [String(first._id)]);
    const inactive = expect(await call(list, "/api/bank-accounts?isActive=false", { user: admin }), 200);
    assert.deepEqual(inactive.data.map((account) => account._id), [String(second._id)]);
  });

  await t.test("detail, raw update, physical deletion, and missing record errors match source", async () => {
    const account = await BankAccount.findOne({ accountNumber: payload.accountNumber });
    const found = expect(await call(detail, `/api/bank-accounts/${account._id}`, {
      user: admin,
      params: { id: String(account._id) },
    }), 200);
    assert.equal(found.data.accountName, payload.accountName);
    const changed = expect(await call(update, `/api/bank-accounts/${account._id}`, {
      method: "PUT",
      user: staff,
      params: { id: String(account._id) },
      body: { currentBalance: 500, isActive: false },
    }), 200);
    assert.equal(changed.data.currentBalance, 500);
    assert.equal(changed.data.isActive, false);
    expect(await call(remove, `/api/bank-accounts/${account._id}`, {
      method: "DELETE",
      user: staff,
      params: { id: String(account._id) },
    }), 200, "Account deleted");
    assert.equal(await BankAccount.collection.findOne({ _id: account._id }), null);
    expect(await call(detail, `/api/bank-accounts/${account._id}`, {
      user: admin,
      params: { id: String(account._id) },
    }), 404, "Account not found");
  });
});

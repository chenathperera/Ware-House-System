import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import { GET as categories } from "../src/app/api/expenses/categories/route.js";
import {
  DELETE as remove,
} from "../src/app/api/expenses/[id]/route.js";
import { GET as list, POST as create } from "../src/app/api/expenses/route.js";
import BankAccount from "../src/server/models/BankAccount.js";
import Expense from "../src/server/models/Expense.js";
import PosSession from "../src/server/models/PosSession.js";
import User from "../src/server/models/User.js";

const uri =
  "mongodb://127.0.0.1:27018/warehouse_system_expenses_test?replicaSet=stockTestRs";

function request(method, path, user, body) {
  return new Request(`http://expenses.test${path}`, {
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

function expensePayload(overrides = {}) {
  return {
    date: "2026-09-24",
    category: "Fuel & Travel",
    amount: 125.5,
    paymentMethod: "cash",
    description: "Expense test",
    ...overrides,
  };
}

test("Expenses preserve source model, API, Bank Account, and POS-session behavior", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  await mongoose.connect(uri);

  t.after(async () => {
    try {
      await Expense.collection.deleteMany({});
      await PosSession.collection.deleteMany({});
      await BankAccount.collection.deleteMany({});
      await User.collection.deleteMany({});
    } finally {
      await mongoose.disconnect();
    }
  });

  await Expense.collection.deleteMany({});
  await PosSession.collection.deleteMany({});
  await BankAccount.collection.deleteMany({});
  await User.collection.deleteMany({});

  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const admin = await User.create({
    firstName: "Expense",
    lastName: "Admin",
    email: `expense-admin-${suffix}@example.invalid`,
    password: "Password9!",
    role: "admin",
  });
  const staff = await User.create({
    firstName: "Expense",
    lastName: "Staff",
    email: `expense-staff-${suffix}@example.invalid`,
    password: "Password9!",
    role: "staff",
  });
  const paymentAccount = await BankAccount.create({
    accountName: `Expense Payment ${suffix}`,
    accountNumber: `EXP-PAY-${suffix}`,
    bankName: "Expense Test Bank",
    category: "payment",
    currentBalance: 1000,
  });
  const openSession = await PosSession.create({
    userId: admin._id,
    openingBalance: 500,
    cashSales: 100,
  });

  await t.test("schema defaults, numbering, validation, and soft deletion match source", async () => {
    await assert.rejects(new Expense({}).validate());
    await assert.rejects(
      new Expense({
        date: new Date(),
        category: "Test",
        amount: 1,
        paymentMethod: "mobile_wallet",
      }).validate(),
    );

    const expense = await Expense.create({
      date: "2026-09-20",
      category: "Model Test",
      amount: 0,
    });
    assert.match(expense.expenseNumber, /^EXP-\d+$/);
    assert.equal(expense.paymentMethod, "cash");
    assert.equal(expense.status, "paid");

    expense.deletedAt = new Date();
    await expense.save();
    assert.equal(await Expense.findById(expense._id), null);
    assert.equal(await Expense.collection.countDocuments({ _id: expense._id }), 1);
  });

  await t.test("authentication, create access, categories, filters, and pagination match source", async () => {
    expectStatus(await call(list, "/api/expenses"), 401);
    expectStatus(await call(categories, "/api/expenses/categories"), 401);

    const created = expectStatus(await call(create, "/api/expenses", {
      method: "POST",
      user: staff,
      body: expensePayload({
        category: "Staff Expense",
        paymentMethod: "card",
      }),
    }), 201).data;
    assert.equal(created.createdBy, staff._id.toString());
    assert.equal(created.bankAccountId, paymentAccount._id.toString());
    assert.equal((await BankAccount.findById(paymentAccount._id)).currentBalance, 874.5);

    const listed = expectStatus(await call(
      list,
      "/api/expenses?category=Staff%20Expense&startDate=2026-09-01&endDate=2026-09-30&page=1&limit=1",
      { user: admin },
    ), 200);
    assert.equal(listed.count, 1);
    assert.equal(listed.total, 1);
    assert.equal(listed.page, 1);
    assert.equal(listed.totalPages, 1);
    assert.equal(listed.data[0].expenseNumber, created.expenseNumber);
    assert.equal(listed.data[0].createdBy.firstName, "Expense");

    const categoryResult = expectStatus(await call(
      categories,
      "/api/expenses/categories",
      { user: admin },
    ), 200);
    assert.deepEqual(categoryResult.data, [...categoryResult.data].sort());
    assert.ok(categoryResult.data.includes("Staff Expense"));
  });

  await t.test("cash Expenses update an open user POS session and delete reverses it", async () => {
    const result = expectStatus(await call(create, "/api/expenses", {
      method: "POST",
      user: admin,
      body: expensePayload(),
    }), 201).data;
    assert.equal(result.posSessionId, openSession._id.toString());
    assert.equal(result.bankAccountId, paymentAccount._id.toString());
    assert.equal((await PosSession.findById(openSession._id)).cashExpenses, 125.5);
    assert.equal((await BankAccount.findById(paymentAccount._id)).currentBalance, 749);

    expectStatus(await call(remove, `/api/expenses/${result._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: result._id },
    }), 200);
    assert.equal((await PosSession.findById(openSession._id)).cashExpenses, 0);
    assert.equal((await BankAccount.findById(paymentAccount._id)).currentBalance, 874.5);
    assert.equal(await Expense.findById(result._id), null);
  });

  await t.test("source Bank and POS quirks are preserved when no session exists or a session closes", async () => {
    const noSession = expectStatus(await call(create, "/api/expenses", {
      method: "POST",
      user: staff,
      body: expensePayload({
        category: "No Session",
        amount: 20,
        paymentMethod: "cash",
      }),
    }), 201).data;
    assert.equal(noSession.posSessionId, undefined);
    assert.equal((await BankAccount.findById(paymentAccount._id)).currentBalance, 854.5);

    const openExpense = expectStatus(await call(create, "/api/expenses", {
      method: "POST",
      user: admin,
      body: expensePayload({
        category: "Closed Session",
        amount: 30,
      }),
    }), 201).data;
    const session = await PosSession.findById(openSession._id);
    session.status = "closed";
    session.actualClosingBalance = 0;
    await session.save();
    assert.equal(session.cashExpenses, 30);

    expectStatus(await call(remove, `/api/expenses/${openExpense._id}`, {
      method: "DELETE",
      user: admin,
      params: { id: openExpense._id },
    }), 200);
    assert.equal((await PosSession.findById(openSession._id)).cashExpenses, 30);
    assert.equal((await BankAccount.findById(paymentAccount._id)).currentBalance, 854.5);
  });

  await t.test("delete is role-restricted and source create has no transaction rollback", async () => {
    const expense = expectStatus(await call(create, "/api/expenses", {
      method: "POST",
      user: admin,
      body: expensePayload({
        category: "Admin Delete",
        amount: 10,
        paymentMethod: "other",
      }),
    }), 201).data;
    expectStatus(await call(remove, `/api/expenses/${expense._id}`, {
      method: "DELETE",
      user: staff,
      params: { id: expense._id },
    }), 403);

    const beforeFailure = (await BankAccount.findById(paymentAccount._id)).currentBalance;
    const failed = await call(create, "/api/expenses", {
      method: "POST",
      user: admin,
      body: expensePayload({
        category: "Validation Failure",
        amount: 5,
        paymentMethod: "invalid",
      }),
    });
    expectStatus(failed, 400);
    assert.equal(
      (await BankAccount.findById(paymentAccount._id)).currentBalance,
      beforeFailure - 5,
    );
    assert.equal(await Expense.countDocuments({ category: "Validation Failure" }), 0);
  });
});

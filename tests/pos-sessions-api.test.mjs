import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import { GET as list } from "../src/app/api/pos-sessions/route.js";
import { GET as active } from "../src/app/api/pos-sessions/active/route.js";
import { POST as open } from "../src/app/api/pos-sessions/open/route.js";
import { POST as close } from "../src/app/api/pos-sessions/close/route.js";
import PosSession from "../src/server/models/PosSession.js";
import User from "../src/server/models/User.js";

const uri = "mongodb://127.0.0.1:27018/warehouse_system_pos_test?replicaSet=stockTestRs";

function request(method, path, user, body) {
  return new Request(`http://pos.test${path}`, {
    method,
    headers: { ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function call(handler, path, { method = "GET", user, body } = {}) {
  const response = await handler(request(method, path, user, body), { params: Promise.resolve({}) });
  return { status: response.status, body: await response.json() };
}

test("POS sessions preserve source lifecycle and API contract", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri);
  assert.match(uri, /127\.0\.0\.1:27018\/warehouse_system_pos_test/);
  await mongoose.connect(uri);
  t.after(async () => { await PosSession.collection.deleteMany({}); await User.collection.deleteMany({}); await mongoose.disconnect(); });
  await PosSession.collection.deleteMany({});
  await User.collection.deleteMany({});
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
  const cashier = await User.create({ firstName: "POS", lastName: "Cashier", email: `pos-${suffix}@example.invalid`, password: "Password9!", role: "staff" });
  const anotherCashier = await User.create({ firstName: "Other", lastName: "Cashier", email: `pos-other-${suffix}@example.invalid`, password: "Password9!", role: "staff" });

  assert.equal((await call(active, "/api/pos-sessions/active")).status, 401);
  const opened = await call(open, "/api/pos-sessions/open", { method: "POST", user: cashier, body: { openingBalance: 100, notes: "Float" } });
  assert.equal(opened.status, 201);
  assert.equal(opened.body.data.status, "open");
  assert.equal(opened.body.data.openingBalance, 100);
  assert.equal(opened.body.data.expectedClosingBalance, 100);
  assert.equal((await call(open, "/api/pos-sessions/open", { method: "POST", user: cashier, body: { openingBalance: 1 } })).status, 400);
  assert.equal((await call(open, "/api/pos-sessions/open", { method: "POST", user: anotherCashier, body: { openingBalance: 50 } })).status, 201);
  assert.equal((await call(active, "/api/pos-sessions/active", { user: cashier })).body.data._id, opened.body.data._id);

  const session = await PosSession.findById(opened.body.data._id);
  session.cashSales = 75.5;
  session.cashExpenses = 20;
  await session.save();
  assert.equal(session.expectedClosingBalance, 155.5);
  const closed = await call(close, "/api/pos-sessions/close", { method: "POST", user: cashier, body: { actualClosingBalance: 150, notes: "Handover" } });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.data.status, "closed");
  assert.equal(closed.body.data.expectedClosingBalance, 155.5);
  assert.equal(closed.body.data.difference, -5.5);
  assert.match(closed.body.data.notes, /Closing Note: Handover/);
  assert.ok(closed.body.data.closedAt);
  assert.equal((await call(close, "/api/pos-sessions/close", { method: "POST", user: cashier, body: { actualClosingBalance: 0 } })).status, 404);
  const sessions = await call(list, "/api/pos-sessions?userId=" + cashier._id + "&page=1&limit=1", { user: cashier });
  assert.equal(sessions.status, 200);
  assert.equal(sessions.body.count, 1);
  assert.equal(sessions.body.data[0].userId.firstName, "POS");
});

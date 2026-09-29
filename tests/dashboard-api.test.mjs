import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import generateToken from "../src/server/auth/token.js";
import { GET } from "../src/app/api/reports/[...segments]/route.js";
import User from "../src/server/models/User.js";

const uri = "mongodb://127.0.0.1:27018/warehouse_system_dashboard_test?replicaSet=stockTestRs";
assert.equal(new URL(uri).port, "27018");
assert.equal(new URL(uri).pathname, "/warehouse_system_dashboard_test");
assert.equal(process.env.MONGODB_URI, uri);
const call = async (segments, user) => {
  const headers = user ? { authorization: `Bearer ${generateToken(user._id)}` } : {};
  const response = await GET(new Request(`http://dashboard.test/api/reports/${segments.join("/")}`, { headers }), { params: Promise.resolve({ segments }) });
  return { status: response.status, body: await response.json() };
};
test("Dashboard API preserves protected empty source shapes", async (t) => {
  await mongoose.connect(uri); await mongoose.connection.dropDatabase();
  const user = { _id: new mongoose.Types.ObjectId(), firstName: "Dash", lastName: "Admin", email: "dashboard@example.invalid", password: "unused", role: "admin", deletedAt: null };
  await User.collection.insertOne(user); t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  assert.equal((await call(["dashboard", "kpis"])).status, 401);
  const kpis = await call(["dashboard", "kpis"], user); assert.equal(kpis.status, 200); assert.equal(kpis.body.data.revenue.thisMonth, 0); assert.equal(kpis.body.data.stock.lowStockCount, 0); assert.equal(kpis.body.data.orders.today, 0);
  const chart = await call(["dashboard", "revenue-chart"], user); assert.equal(chart.body.data.length, 6); assert.ok(chart.body.data.every((row) => row.revenue === 0));
  assert.deepEqual((await call(["dashboard", "top-products"], user)).body.data, []); assert.deepEqual((await call(["dashboard", "top-customers"], user)).body.data, []);
});

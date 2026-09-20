import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import User from "../src/server/models/User.js";
import CustomerGroup from "../src/server/models/CustomerGroup.js";

const approvedURI = "mongodb://127.0.0.1:27017/warehouse_system_next";
const run = randomUUID();
const prefix = `phase5-cg-${run}`;
const password = `Synthetic9${randomBytes(18).toString("hex")}`;
const base = "http://127.0.0.1:3110";
const createdIds = [];
const shortRun = run.replace(/-/g, "").slice(0, 12);
let server;
let serverLog = "";

function fixture(role) {
  return { firstName: "SyntheticGroup", lastName: role, email: `${prefix}-${role}@example.invalid`, password, role };
}
async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const text = await response.text();
  return { status: response.status, body: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : text };
}
function status(result, expected, message) {
  assert.equal(result.status, expected, `Expected ${expected}; got ${result.status}: ${result.body?.message ?? result.body}`);
  if (message) assert.equal(result.body.message, message);
  if (expected >= 400) { assert.equal(result.body.success, false); assert.ok("stack" in result.body); }
  return result.body.data;
}
const post = (path, body, token) => request(path, { method: "POST", body, token });
const put = (path, body, token) => request(path, { method: "PUT", body, token });
const del = (path, token) => request(path, { method: "DELETE", token });
const get = (path, token) => request(path, { token });

test("customer groups module contract against the isolated local database", { timeout: 240000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, approvedURI, "Refusing any unapproved database");
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
  t.after(async () => {
    try {
      for (const id of createdIds) await CustomerGroup.collection.deleteOne({ _id: id });
      await User.deleteMany({ email: { $regex: `^${prefix}-` } });
    } finally {
      await mongoose.disconnect();
      if (server?.exitCode === null) {
        if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        else server.kill("SIGTERM");
      }
    }
  });
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3110"], { cwd: process.cwd(), windowsHide: true, env: { ...process.env, NODE_ENV: "development" }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (chunk) => { serverLog = (serverLog + chunk).slice(-12000); });
  server.stderr.on("data", (chunk) => { serverLog = (serverLog + chunk).slice(-12000); });
  let ready = false;
  for (let index = 0; index < 90; index += 1) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${serverLog}`);
    try { ready = (await fetch(`${base}/api/health`)).ok; } catch { /* wait */ }
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, "Test server must start");
  await CustomerGroup.collection.createIndex({ name: 1 }, { unique: true });
  await CustomerGroup.collection.createIndex({ code: 1 }, { unique: true });
  const admin = await User.create(fixture("admin"));
  const manager = await User.create(fixture("manager"));
  const staff = await User.create(fixture("staff"));
  const login = async (user) => status(await post("/auth/login", { email: user.email, password }), 200).token;
  const adminToken = await login(admin);
  const managerToken = await login(manager);
  const staffToken = await login(staff);
  const primaryCode = `GP${shortRun}`.toUpperCase();

  await t.test("unauthenticated users cannot list groups", async () => { status(await get("/customer-groups"), 401); });
  await t.test("staff cannot create groups", async () => { status(await post("/customer-groups", { name: "Blocked", code: "BLOCKED" }, staffToken), 403); });
  await t.test("admin creates a group with validation and commercial defaults", async () => {
    status(await post("/customer-groups", { name: "", code: "" }, adminToken), 400, "Validation failed");
    const group = status(await post("/customer-groups", { name: "Priority Group", code: primaryCode, defaultPaymentTerms: { type: "credit", creditDays: 30, defaultCreditLimit: 50000 }, defaultDiscountPercent: 5, priority: 10 }, adminToken), 201);
    assert.equal(group.code, primaryCode); assert.equal(group.defaultPaymentTerms.creditDays, 30); assert.equal(group.priority, 10);
    createdIds.push(new mongoose.Types.ObjectId(group._id));
  });
  await t.test("duplicate name and code return the original duplicate contract", async () => {
    status(await post("/customer-groups", { name: "Priority Group", code: `GX${shortRun}`.slice(0, 20) }, adminToken), 400, "Duplicate name: Priority Group already exists");
    status(await post("/customer-groups", { name: `Other Group ${shortRun}`, code: primaryCode }, adminToken), 400, `Duplicate code: ${primaryCode} already exists`);
  });
  await t.test("manager can search, update, and soft-delete groups", async () => {
    const listed = await get("/customer-groups?search=Priority", managerToken);
    status(listed, 200); assert.equal(listed.body.count, 1);
    const id = createdIds[0].toString();
    const updated = status(await put(`/customer-groups/${id}`, { name: "Updated Priority", isActive: false, color: "#000000" }, managerToken), 200);
    assert.equal(updated.name, "Updated Priority"); assert.equal(updated.isActive, false);
    status(await del(`/customer-groups/${id}`, managerToken), 200, "Customer group deleted");
    const hidden = await CustomerGroup.collection.findOne({ _id: createdIds[0] });
    assert.ok(hidden.deletedAt); assert.equal(hidden.isActive, false);
    assert.equal(status(await get("/customer-groups", staffToken), 200).some((row) => row._id === id), false);
  });
  await t.test("missing and invalid groups report consistent errors", async () => {
    const missing = new mongoose.Types.ObjectId();
    status(await get(`/customer-groups/${missing}`, adminToken), 404, "Customer group not found");
    status(await put(`/customer-groups/${missing}`, { name: "X" }, adminToken), 404, "Customer group not found");
    status(await del(`/customer-groups/${missing}`, adminToken), 404, "Customer group not found");
    status(await get("/customer-groups/not-an-id", adminToken), 404, "Resource not found");
  });
});

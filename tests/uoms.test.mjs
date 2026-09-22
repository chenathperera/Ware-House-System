import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import User from "../src/server/models/User.js";
import UnitOfMeasure from "../src/server/models/UnitOfMeasure.js";
import { defaultUoms } from "../src/server/bootstrap/seed-defaults.js";

const approvedURI = "mongodb://127.0.0.1:27017/warehouse_system_next";
const run = randomUUID();
const prefix = `phase5-uom-${run}`;
const password = `Synthetic9${randomBytes(18).toString("hex")}`;
const base = "http://127.0.0.1:3107";
let server;
let serverLog = "";
let admin;
let manager;
let staff;
let adminToken;
let managerToken;
let staffToken;
const createdUomIds = [];
const shortRun = run.replace(/-/g, "").slice(0, 8);

function userFixture(role, name) {
  return {
    firstName: "SyntheticUom",
    lastName: name,
    email: `${prefix}-${role}-${name}@example.invalid`,
    password,
    role,
  };
}

async function request(path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: response.headers.get("content-type")?.includes("application/json")
      ? JSON.parse(text)
      : text,
  };
}

function status(result, expected, message) {
  assert.equal(
    result.status,
    expected,
    `Expected ${expected}; got ${result.status}: ${result.body?.message ?? result.body}`,
  );
  if (message) assert.equal(result.body.message, message);
  if (expected >= 400) {
    assert.equal(result.body.success, false);
    assert.ok("stack" in result.body);
  }
  return result.body.data;
}

const post = (path, body, token) => request(path, { method: "POST", body, token });
const put = (path, body, token) => request(path, { method: "PUT", body, token });
const del = (path, token) => request(path, { method: "DELETE", token });
const get = (path, token) => request(path, { token });
const login = (email) => post("/auth/login", { email, password });

test("uoms module contract against the isolated local database", { timeout: 240000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, approvedURI, "Refusing any unapproved database");
  assert.ok(process.env.JWT_SECRET, "A local JWT secret is required");

  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 5000,
  });

  t.after(async () => {
    try {
      for (const id of createdUomIds) {
        await UnitOfMeasure.collection.deleteOne({ _id: id });
      }
      await User.deleteMany({ email: { $regex: `^${prefix}-` } });
    } finally {
      await mongoose.disconnect();
      if (server && server.exitCode === null) {
        if (process.platform === "win32") {
          spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
            windowsHide: true,
            stdio: "ignore",
          });
        } else {
          server.kill("SIGTERM");
        }
      }
    }
  });

  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3107"],
    {
      cwd: process.cwd(),
      windowsHide: true,
      env: { ...process.env, NODE_ENV: "development" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => {
    serverLog = (serverLog + chunk).slice(-12000);
  });
  server.stderr.on("data", (chunk) => {
    serverLog = (serverLog + chunk).slice(-12000);
  });

  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${serverLog}`);
    try {
      ready = (await fetch(`${base}/api/health`)).ok;
    } catch {
      /* wait */
    }
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, "Test server must start");

  await UnitOfMeasure.collection.createIndex({ name: 1 }, { unique: true });
  await UnitOfMeasure.collection.createIndex({ symbol: 1 }, { unique: true });

  admin = await User.create(userFixture("admin", "admin"));
  manager = await User.create(userFixture("manager", "manager"));
  staff = await User.create(userFixture("staff", "staff"));

  adminToken = status(await login(admin.email), 200).token;
  managerToken = status(await login(manager.email), 200).token;
  staffToken = status(await login(staff.email), 200).token;

  await t.test("source default UOMs initialize before authenticated API work", async () => {
    const listed = await get("/uoms", staffToken);
    const uoms = status(listed, 200);
    assert.deepEqual(
      uoms
        .filter((uom) => defaultUoms.some((expected) => expected.name === uom.name))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(({ name, symbol, type }) => ({ name, symbol, type })),
      [...defaultUoms].sort((left, right) => left.name.localeCompare(right.name)),
    );
  });

  const uomName = `Synthetic UOM ${shortRun}`;
  const uomSymbol = `su${shortRun.slice(0, 6)}`;

  await t.test("unauthenticated list is rejected", async () => {
    status(await get("/uoms"), 401);
  });

  await t.test("staff cannot create uoms", async () => {
    status(
      await post(
        "/uoms",
        { name: `${prefix} blocked`, symbol: `b${shortRun}`, type: "count" },
        staffToken,
      ),
      403,
    );
  });

  await t.test("admin creates uom with validation and defaults", async () => {
    status(
      await post("/uoms", { name: "", symbol: "", type: "count" }, adminToken),
      400,
      "Validation failed",
    );

    const created = status(
      await post(
        "/uoms",
        { name: uomName, symbol: uomSymbol, type: "weight", isActive: true },
        adminToken,
      ),
      201,
    );
    assert.ok(created._id);
    assert.equal(created.name, uomName);
    assert.equal(created.symbol, uomSymbol);
    assert.equal(created.type, "weight");
    assert.equal(created.isActive, true);
    assert.equal(created.createdBy, undefined);
    createdUomIds.push(new mongoose.Types.ObjectId(created._id));
  });

  await t.test("duplicate name and symbol return 400", async () => {
    status(
      await post(
        "/uoms",
        { name: uomName, symbol: "other", type: "count" },
        adminToken,
      ),
      400,
      `Duplicate name: ${uomName} already exists`,
    );
    status(
      await post(
        "/uoms",
        { name: "Other Name", symbol: uomSymbol, type: "count" },
        adminToken,
      ),
      400,
      `Duplicate symbol: ${uomSymbol} already exists`,
    );
  });

  await t.test("manager can list with filters, update, and hard-delete uoms", async () => {
    const secondary = status(
      await post(
        "/uoms",
        { name: `Count UOM ${shortRun}`, symbol: `cu${shortRun}`, type: "count" },
        managerToken,
      ),
      201,
    );
    const secondaryId = new mongoose.Types.ObjectId(secondary._id);
    createdUomIds.push(secondaryId);

    const byType = await get("/uoms?type=count", managerToken);
    status(byType, 200);
    assert.ok(byType.body.data.some((row) => row._id === secondary._id));

    const activeOnly = await get("/uoms?isActive=true", managerToken);
    status(activeOnly, 200);
    assert.ok(activeOnly.body.count >= 2);

    const updated = status(
      await put(`/uoms/${secondary._id}`, { isActive: false }, managerToken),
      200,
    );
    assert.equal(updated.isActive, false);

    status(await del(`/uoms/${secondary._id}`, managerToken), 200, "UOM deleted");

    const removed = await UnitOfMeasure.collection.findOne({ _id: secondaryId });
    assert.equal(removed, null, "Hard delete must remove the document");
    createdUomIds.splice(
      createdUomIds.findIndex((id) => id.toString() === secondaryId.toString()),
      1,
    );
  });

  await t.test("no GET by id route is exposed", async () => {
    const id = createdUomIds[0].toString();
    assert.equal((await get(`/uoms/${id}`, staffToken)).status, 405);
  });

  await t.test("missing uom returns 404 on update and delete", async () => {
    const missing = new mongoose.Types.ObjectId();
    status(await put(`/uoms/${missing}`, { name: "X" }, adminToken), 404, "UOM not found");
    status(await del(`/uoms/${missing}`, adminToken), 404, "UOM not found");
  });

  await t.test("invalid id returns resource not found", async () => {
    status(await put("/uoms/not-an-id", { name: "X" }, adminToken), 404, "Resource not found");
    status(await del("/uoms/not-an-id", adminToken), 404, "Resource not found");
  });
});

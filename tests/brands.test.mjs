import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import User from "../src/server/models/User.js";
import Brand from "../src/server/models/Brand.js";

const approvedURI = "mongodb://127.0.0.1:27017/warehouse_system_next";
const run = randomUUID();
const prefix = `phase5-brand-${run}`;
const password = `Synthetic9${randomBytes(18).toString("hex")}`;
const base = "http://127.0.0.1:3106";
let server;
let serverLog = "";
let admin;
let manager;
let staff;
let adminToken;
let managerToken;
let staffToken;
const createdBrandIds = [];
const shortRun = run.replace(/-/g, "").slice(0, 12);
const brandNamePrimary = `Brand Primary ${shortRun}`;
const brandNameSecondary = `Brand Secondary ${shortRun}`;

function userFixture(role, name) {
  return {
    firstName: "SyntheticBrand",
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

test("brands module contract against the isolated local database", { timeout: 240000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, approvedURI, "Refusing any unapproved database");
  assert.ok(process.env.JWT_SECRET, "A local JWT secret is required");

  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 5000,
  });

  t.after(async () => {
    try {
      for (const id of createdBrandIds) {
        await Brand.collection.deleteOne({ _id: id });
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
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3106"],
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

  await Brand.collection.createIndex({ name: 1 }, { unique: true });

  admin = await User.create(userFixture("admin", "admin"));
  manager = await User.create(userFixture("manager", "manager"));
  staff = await User.create(userFixture("staff", "staff"));

  adminToken = status(await login(admin.email), 200).token;
  managerToken = status(await login(manager.email), 200).token;
  staffToken = status(await login(staff.email), 200).token;

  await t.test("unauthenticated list is rejected", async () => {
    status(await get("/brands"), 401);
  });

  await t.test("staff cannot create brands", async () => {
    status(
      await post("/brands", { name: `${prefix} Blocked Brand` }, staffToken),
      403,
    );
  });

  await t.test("admin creates brand with validation and default isOwnBrand", async () => {
    status(await post("/brands", { name: "" }, adminToken), 400, "Validation failed");

    const created = status(
      await post(
        "/brands",
        {
          name: brandNamePrimary,
          code: "own01",
          description: "Synthetic brand",
          isActive: true,
        },
        adminToken,
      ),
      201,
    );
    assert.ok(created._id);
    assert.equal(created.name, brandNamePrimary);
    assert.equal(created.code, "OWN01");
    assert.equal(created.isOwnBrand, true);
    assert.equal(created.isActive, true);
    createdBrandIds.push(new mongoose.Types.ObjectId(created._id));
  });

  await t.test("duplicate name returns 400", async () => {
    status(
      await post("/brands", { name: brandNamePrimary, code: "OTHER" }, adminToken),
      400,
      `Duplicate name: ${brandNamePrimary} already exists`,
    );
  });

  await t.test("manager can list, search, filter, update, and soft-delete brands", async () => {
    const secondary = status(
      await post(
        "/brands",
        {
          name: brandNameSecondary,
          code: "tp01",
          isOwnBrand: false,
        },
        managerToken,
      ),
      201,
    );
    createdBrandIds.push(new mongoose.Types.ObjectId(secondary._id));
    assert.equal(secondary.isOwnBrand, false);

    const search = await get(`/brands?search=${encodeURIComponent("Secondary")}`, managerToken);
    status(search, 200);
    assert.equal(search.body.count, 1);
    assert.equal(search.body.data[0].name, brandNameSecondary);

    const activeOnly = await get("/brands?isActive=true", managerToken);
    status(activeOnly, 200);
    assert.ok(activeOnly.body.count >= 2);

    const updated = status(
      await put(
        `/brands/${secondary._id}`,
        { name: `${brandNameSecondary} Updated`, isActive: false },
        managerToken,
      ),
      200,
    );
    assert.equal(updated.name, `${brandNameSecondary} Updated`);
    assert.equal(updated.isActive, false);

    status(await del(`/brands/${secondary._id}`, managerToken), 200, "Brand deleted");

    const hidden = await Brand.collection.findOne({
      _id: new mongoose.Types.ObjectId(secondary._id),
    });
    assert.ok(hidden.deletedAt);
    assert.equal(hidden.isActive, false);

    const visible = status(await get("/brands", staffToken), 200);
    assert.equal(
      visible.some((row) => row._id === secondary._id),
      false,
      "Soft-deleted brand must not appear in list",
    );
  });

  await t.test("detail retrieval returns brand by id", async () => {
    const id = createdBrandIds[0].toString();
    const brand = status(await get(`/brands/${id}`, staffToken), 200);
    assert.equal(brand.name, brandNamePrimary);
  });

  await t.test("missing brand returns 404", async () => {
    const missing = new mongoose.Types.ObjectId();
    status(await get(`/brands/${missing}`, adminToken), 404, "Brand not found");
    status(await put(`/brands/${missing}`, { name: "X" }, adminToken), 404, "Brand not found");
    status(await del(`/brands/${missing}`, adminToken), 404, "Brand not found");
  });

  await t.test("invalid id returns resource not found", async () => {
    status(await get("/brands/not-an-id", adminToken), 404, "Resource not found");
  });
});

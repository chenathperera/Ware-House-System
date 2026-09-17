import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import User from "../src/server/models/User.js";
import Category from "../src/server/models/Category.js";

const approvedURI = "mongodb://127.0.0.1:27017/warehouse_system_next";
const run = randomUUID();
const prefix = `phase5-cat-${run}`;
const password = `Synthetic9${randomBytes(18).toString("hex")}`;
const base = "http://127.0.0.1:3105";
let server;
let serverLog = "";
let admin;
let manager;
let staff;
let adminToken;
let managerToken;
let staffToken;
const createdCategoryIds = [];
const shortRun = run.replace(/-/g, "").slice(0, 12);
const codeRoot = `CR${shortRun}`.toUpperCase();
const codeChild = `CC${shortRun}`.toUpperCase();

function userFixture(role, name) {
  return {
    firstName: "SyntheticCat",
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

test("categories module contract against the isolated local database", { timeout: 240000 }, async (t) => {
  assert.equal(process.env.MONGODB_URI, approvedURI, "Refusing any unapproved database");
  assert.ok(process.env.JWT_SECRET, "A local JWT secret is required");

  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 5000,
  });

  t.after(async () => {
    try {
      for (const id of createdCategoryIds) {
        await Category.collection.deleteOne({ _id: id });
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
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3105"],
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

  await Category.collection.createIndex({ code: 1 }, { unique: true });

  admin = await User.create(userFixture("admin", "admin"));
  manager = await User.create(userFixture("manager", "manager"));
  staff = await User.create(userFixture("staff", "staff"));

  adminToken = status(await login(admin.email), 200).token;
  managerToken = status(await login(manager.email), 200).token;
  staffToken = status(await login(staff.email), 200).token;

  await t.test("unauthenticated list is rejected", async () => {
    status(await get("/categories"), 401);
  });

  await t.test("staff cannot create categories", async () => {
    status(
      await post(
        "/categories",
        { name: "Blocked", code: `${prefix}-BLK`.slice(0, 20) },
        staffToken,
      ),
      403,
    );
  });

  await t.test("admin creates category with validation and response envelope", async () => {
    status(await post("/categories", { name: "", code: "" }, adminToken), 400, "Validation failed");

    const created = status(
      await post(
        "/categories",
        {
          name: "Root Category",
          code: codeRoot,
          description: "Synthetic root",
          type: "product",
          isActive: true,
        },
        adminToken,
      ),
      201,
    );
    assert.ok(created._id);
    assert.equal(created.code, codeRoot);
    assert.equal(created.name, "Root Category");
    assert.equal(created.type, "product");
    assert.equal(created.isActive, true);
    createdCategoryIds.push(new mongoose.Types.ObjectId(created._id));
  });

  await t.test("duplicate code returns 400", async () => {
    status(
      await post("/categories", { name: "Duplicate", code: codeRoot }, adminToken),
      400,
      `Duplicate code: ${codeRoot} already exists`,
    );
  });

  await t.test("manager can list, update, and soft-delete categories", async () => {
    const parentId = createdCategoryIds[0].toString();

    const child = status(
      await post(
        "/categories",
        { name: "Child Category", code: codeChild, parentCategory: parentId, type: "both" },
        managerToken,
      ),
      201,
    );
    createdCategoryIds.push(new mongoose.Types.ObjectId(child._id));

    const list = await get("/categories?search=Child", managerToken);
    status(list, 200);
    assert.equal(list.body.count, 1);
    assert.equal(list.body.data[0].parentCategory.name, "Root Category");

    const updated = status(
      await put(
        `/categories/${child._id}`,
        { name: "Child Updated", isActive: false },
        managerToken,
      ),
      200,
    );
    assert.equal(updated.name, "Child Updated");
    assert.equal(updated.isActive, false);

    status(await del(`/categories/${child._id}`, managerToken), 200, "Category deleted");

    const hidden = await Category.collection.findOne({ _id: new mongoose.Types.ObjectId(child._id) });
    assert.ok(hidden.deletedAt);
    assert.equal(hidden.isActive, false);

    const visible = status(await get("/categories", staffToken), 200);
    assert.equal(
      visible.some((row) => row._id === child._id),
      false,
      "Soft-deleted category must not appear in list",
    );
  });

  await t.test("missing category returns 404", async () => {
    const missing = new mongoose.Types.ObjectId();
    status(await get(`/categories/${missing}`, adminToken), 404, "Category not found");
    status(await put(`/categories/${missing}`, { name: "X" }, adminToken), 404, "Category not found");
    status(await del(`/categories/${missing}`, adminToken), 404, "Category not found");
  });

  await t.test("invalid id returns resource not found", async () => {
    status(await get("/categories/not-an-id", adminToken), 404, "Resource not found");
  });
});

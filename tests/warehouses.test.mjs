import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import User from "../src/server/models/User.js";
import Warehouse from "../src/server/models/Warehouse.js";

const approvedURI = "mongodb://127.0.0.1:27017/warehouse_system_next";
const run = randomUUID();
const prefix = `phase5-wh-${run}`;
const password = `Synthetic9${randomBytes(18).toString("hex")}`;
const base = "http://127.0.0.1:3109";
let server;
let serverLog = "";
let admin;
let manager;
let staff;
let adminToken;
let managerToken;
let staffToken;
const createdWarehouseIds = [];
const shortRun = run.replace(/-/g, "").slice(0, 8);
const codePrimary = `WH${shortRun}`.toUpperCase();
const codeSecondary = `WS${shortRun}`.toUpperCase();

function userFixture(role, name) {
  return {
    firstName: "SyntheticWh",
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

test(
  "warehouses module contract against the isolated local database",
  { timeout: 240000 },
  async (t) => {
    assert.equal(process.env.MONGODB_URI, approvedURI, "Refusing any unapproved database");
    assert.ok(process.env.JWT_SECRET, "A local JWT secret is required");

    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
    });

    t.after(async () => {
      try {
        for (const id of createdWarehouseIds) {
          await Warehouse.collection.deleteOne({ _id: id });
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
      ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3109"],
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

    await Warehouse.collection.createIndex({ warehouseCode: 1 }, { unique: true });

    admin = await User.create(userFixture("admin", "admin"));
    manager = await User.create(userFixture("manager", "manager"));
    staff = await User.create(userFixture("staff", "staff"));

    adminToken = status(await login(admin.email), 200).token;
    managerToken = status(await login(manager.email), 200).token;
    staffToken = status(await login(staff.email), 200).token;

    await t.test("unauthenticated list is rejected", async () => {
      status(await get("/warehouses"), 401);
    });

    await t.test("staff cannot create warehouses", async () => {
      status(
        await post(
          "/warehouses",
          { warehouseCode: "BLOCKED", name: "Blocked Warehouse", type: "branch" },
          staffToken,
        ),
        403,
      );
    });

    await t.test("admin creates warehouse with validation", async () => {
      status(
        await post("/warehouses", { warehouseCode: "", name: "" }, adminToken),
        400,
        "Validation failed",
      );

      const created = status(
        await post(
          "/warehouses",
          {
            warehouseCode: codePrimary,
            name: `Primary Warehouse ${shortRun}`,
            type: "main",
            isDefault: true,
            settings: { pickingStrategy: "FIFO" },
          },
          adminToken,
        ),
        201,
      );
      assert.equal(created.warehouseCode, codePrimary);
      assert.equal(created.isDefault, true);
      createdWarehouseIds.push(new mongoose.Types.ObjectId(created._id));
    });

    await t.test("duplicate warehouse code returns 400", async () => {
      status(
        await post(
          "/warehouses",
          { warehouseCode: codePrimary, name: "Duplicate", type: "branch" },
          adminToken,
        ),
        400,
        `Duplicate warehouseCode: ${codePrimary} already exists`,
      );
    });

    await t.test("setting a new default clears the previous default", async () => {
      const secondary = status(
        await post(
          "/warehouses",
          {
            warehouseCode: codeSecondary,
            name: `Secondary Warehouse ${shortRun}`,
            type: "branch",
            isDefault: true,
          },
          managerToken,
        ),
        201,
      );
      createdWarehouseIds.push(new mongoose.Types.ObjectId(secondary._id));
      assert.equal(secondary.isDefault, true);

      const primary = await Warehouse.findById(createdWarehouseIds[0]);
      assert.equal(primary.isDefault, false);
    });

    await t.test("manager can search, update, and soft-delete non-default warehouses", async () => {
      const search = await get(`/warehouses?search=${encodeURIComponent("Secondary")}`, managerToken);
      status(search, 200);
      assert.equal(search.body.count, 1);

      const secondaryId = createdWarehouseIds[1].toString();
      const updated = status(
        await put(
          `/warehouses/${secondaryId}`,
          { name: `Secondary Updated ${shortRun}`, warehouseManager: "" },
          managerToken,
        ),
        200,
      );
      assert.equal(updated.name, `Secondary Updated ${shortRun}`);

      status(await del(`/warehouses/${secondaryId}`, managerToken), 200, "Warehouse deleted");

      const hidden = await Warehouse.collection.findOne({ _id: createdWarehouseIds[1] });
      assert.ok(hidden.deletedAt);
      assert.equal(hidden.isActive, false);
    });

    await t.test("cannot delete the default warehouse", async () => {
      status(
        await del(`/warehouses/${createdWarehouseIds[0]}`, adminToken),
        400,
        "Cannot delete the default warehouse. Set another as default first.",
      );
    });

    await t.test("detail retrieval populates manager fields", async () => {
      const detail = status(await get(`/warehouses/${createdWarehouseIds[0]}`, staffToken), 200);
      assert.equal(detail.warehouseCode, codePrimary);
    });

    await t.test("missing warehouse returns 404", async () => {
      const missing = new mongoose.Types.ObjectId();
      status(await get(`/warehouses/${missing}`, adminToken), 404, "Warehouse not found");
      status(await put(`/warehouses/${missing}`, { name: "X" }, adminToken), 404, "Warehouse not found");
      status(await del(`/warehouses/${missing}`, adminToken), 404, "Warehouse not found");
    });

    await t.test("invalid id returns resource not found", async () => {
      status(await get("/warehouses/not-an-id", adminToken), 404, "Resource not found");
    });
  },
);

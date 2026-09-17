import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import User from "../src/server/models/User.js";
import CompanySettings from "../src/server/models/CompanySettings.js";

const approvedURI = "mongodb://127.0.0.1:27017/warehouse_system_next";
const run = randomUUID();
const prefix = `phase5-settings-${run}`;
const password = `Synthetic9${randomBytes(18).toString("hex")}`;
const base = "http://127.0.0.1:3108";
let server;
let serverLog = "";
let admin;
let manager;
let staff;
let adminToken;
let managerToken;
let staffToken;
let priorSettings;

function userFixture(role, name) {
  return {
    firstName: "SyntheticSettings",
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
const get = (path, token) => request(path, { token });
const login = (email) => post("/auth/login", { email, password });

test(
  "company settings module contract against the isolated local database",
  { timeout: 240000 },
  async (t) => {
    assert.equal(process.env.MONGODB_URI, approvedURI, "Refusing any unapproved database");
    assert.ok(process.env.JWT_SECRET, "A local JWT secret is required");

    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
    });

    priorSettings = await CompanySettings.findOne().lean();

    t.after(async () => {
      try {
        await CompanySettings.deleteMany({});
        if (priorSettings) {
          const { _id, __v, ...rest } = priorSettings;
          await CompanySettings.collection.insertOne({ _id, ...rest });
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
      ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3108"],
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

    await CompanySettings.deleteMany({});

    admin = await User.create(userFixture("admin", "admin"));
    manager = await User.create(userFixture("manager", "manager"));
    staff = await User.create(userFixture("staff", "staff"));

    adminToken = status(await login(admin.email), 200).token;
    managerToken = status(await login(manager.email), 200).token;
    staffToken = status(await login(staff.email), 200).token;

    await t.test("unauthenticated read is rejected", async () => {
      status(await get("/settings/company"), 401);
    });

    await t.test("GET auto-creates defaults when collection is empty", async () => {
      const settings = status(await get("/settings/company", staffToken), 200);
      assert.equal(settings.companyName, "YOUR COMPANY NAME");
      assert.equal(settings.address, "YOUR STREET, CITY");
      assert.equal(settings.phone, "+94 11 XXX XXXX");
      assert.equal(
        settings.receiptFooterMessage,
        "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.",
      );
      assert.equal(await CompanySettings.countDocuments(), 1);
    });

    await t.test("staff cannot update settings", async () => {
      status(
        await put("/settings/company", { companyName: `${prefix} blocked` }, staffToken),
        403,
      );
    });

    await t.test("admin updates all fields through whitelist assignment", async () => {
      const updated = status(
        await put(
          "/settings/company",
          {
            companyName: `${prefix} Test Co`,
            address: "123 Test Street",
            phone: "+94 77 123 4567",
            email: "test@example.invalid",
            website: "https://example.invalid",
            taxRegistrationNumber: "TAX-123",
            receiptFooterMessage: "Thanks!",
          },
          adminToken,
        ),
        200,
      );
      assert.equal(updated.companyName, `${prefix} Test Co`);
      assert.equal(updated.email, "test@example.invalid");
      assert.equal(updated.receiptFooterMessage, "Thanks!");
    });

    await t.test("manager partial update preserves unspecified fields", async () => {
      const updated = status(
        await put("/settings/company", { phone: "+94 11 999 8888" }, managerToken),
        200,
      );
      assert.equal(updated.phone, "+94 11 999 8888");
      assert.equal(updated.companyName, `${prefix} Test Co`);
      assert.equal(updated.email, "test@example.invalid");
    });

    await t.test("authenticated staff can read updated settings", async () => {
      const settings = status(await get("/settings/company", staffToken), 200);
      assert.equal(settings.companyName, `${prefix} Test Co`);
      assert.equal(settings.phone, "+94 11 999 8888");
    });
  },
);

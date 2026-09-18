import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../src/server/models/User.js";
import generateToken, { verifyToken } from "../src/server/auth/token.js";
import { createResponse, errorResponse } from "../src/server/http/response.js";
import { authorize } from "../src/server/auth/guards.js";

// Never run against another database or reuse any existing account.
const approvedURI = "mongodb://127.0.0.1:27017/warehouse_system_next";
const run = randomUUID();
const prefix = `phase3-auth-${run}`;
const records = new Map();
const password = `Synthetic9${randomBytes(18).toString("hex")}`;
const base = "http://127.0.0.1:3104";
let server;
let serverLog = "";
let admin, staff, customer, adminToken, staffToken, customerToken;

function fixture(name, extras = {}) {
  const body = {
    firstName: "SyntheticAuth",
    lastName: name,
    email: `${prefix}-${name}@example.invalid`,
    password,
    ...extras,
  };
  records.set(body.email, null); // Track before insert, even if the HTTP reply fails.
  return body;
}
async function direct(name, extras = {}) {
  const user = await User.create(fixture(name, extras));
  records.set(user.email, user._id);
  return user;
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
    headers: response.headers,
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
  if (expected >= 400 && expected !== 429) {
    assert.equal(result.body.success, false);
    assert.ok("stack" in result.body);
  }
  return result.body.data;
}
const post = (path, body, token) => request(path, { method: "POST", body, token });
const login = (email) => post("/auth/login", { email, password });
const read = (user) => User.findById(user._id).select("+password");
const alter = (user, changes) =>
  User.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(user._id), email: user.email },
    { $set: changes },
  );

test(
  "backend authentication contract against the isolated local database",
  { timeout: 240000 },
  async (t) => {
    assert.equal(process.env.MONGODB_URI, approvedURI, "Refusing any unapproved database");
    assert.ok(process.env.JWT_SECRET, "A local JWT secret is required");
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
    });
    let emptyConfirmed = false;
    t.after(async () => {
      try {
        if (emptyConfirmed) {
          for (const [email, id] of records) {
            assert.ok(email.startsWith(prefix) && email.endsWith("@example.invalid"));
            const filter = { email, firstName: "SyntheticAuth", ...(id ? { _id: id } : {}) };
            // Exact task-generated identity only; never deleteMany/drop/syncIndexes.
            await User.collection.deleteOne(filter);
          }
          assert.equal(
            await User.countDocuments(),
            0,
            "All task synthetic records must be removed",
          );
          t.diagnostic(
            `Cleaned only ${records.size} tracked synthetic identities with prefix ${prefix}; users count restored to zero.`,
          );
        }
      } finally {
        await mongoose.disconnect();
        if (server && server.exitCode === null) {
          if (process.platform === "win32")
            spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
              windowsHide: true,
              stdio: "ignore",
            });
          else server.kill("SIGTERM");
        }
      }
    });
    assert.equal(await User.countDocuments(), 0, "Refusing tests: users collection must be empty");
    emptyConfirmed = true;
    const indexesBefore = await User.collection.indexes().catch((error) => {
      if (error.code === 26) return [];
      throw error;
    });
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3104"],
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
        /* wait for the owned server */
      }
      if (ready) break;
      await delay(500);
    }
    assert.ok(ready, "Test server must start");

    await t.test(
      "A14/A19 first-user validation, forced admin, exact response and model defaults",
      async () => {
        status(
          await post("/auth/register", { ...fixture("weak"), password: "weak", role: "staff" }),
          400,
          "Validation failed",
        );
        status(
          await post("/auth/register", fixture("bad-role", { role: "unknown" })),
          400,
          "Validation failed",
        );
        const body = fixture("admin", {
          role: "staff",
          permissions: ["manage_users"],
          isActive: false,
          nic: "discard",
          address: "discard",
        });
        const result = await post("/auth/register", body);
        admin = status(result, 201, "Admin account created successfully. Please login.");
        assert.equal(admin.role, "admin");
        assert.deepEqual(
          Object.keys(admin).sort(),
          ["_id", "email", "firstName", "fullName", "lastName", "role"].sort(),
        );
        const stored = await read(admin);
        assert.equal(stored.isActive, true);
        assert.deepEqual([...stored.permissions], []);
        assert.equal(stored.nic, undefined);
        assert.equal(stored.createdBy, undefined);
        assert.equal(stored.password.slice(0, 7), "$2b$10$");
        assert.ok(await bcrypt.compare(password, stored.password));
      },
    );
    await t.test("A01/A26 valid login, id-only JWT claims and seven-day expiry", async () => {
      const before = await read(admin);
      const result = await login(admin.email);
      const data = status(result, 200, "Login successful");
      adminToken = data.token;
      assert.deepEqual(
        Object.keys(data).sort(),
        ["_id", "firstName", "lastName", "fullName", "email", "role", "lastLogin", "token"].sort(),
      );
      const claims = jwt.verify(adminToken, process.env.JWT_SECRET);
      assert.deepEqual(Object.keys(claims).sort(), ["exp", "iat", "id"]);
      assert.equal(claims.exp - claims.iat, 7 * 86400);
      assert.equal(claims.id, admin._id);
      assert.equal((await read(admin)).password, before.password);
    });
    await t.test("A15/A17/A18 registration guard, validation, and controller precedence", async () => {
      status(
        await post("/auth/register", fixture("unauthorized")),
        401,
        "Not authorized, no token provided",
      );
      status(
        await post("/auth/register", { ...fixture("duplicate"), email: admin.email }),
        401,
        "Not authorized, no token provided",
      );
      status(await post("/auth/register", { email: "bad" }), 401, "Not authorized, no token provided");
      status(
        await post("/auth/register", fixture("invalid-token"), "invalid-token"),
        401,
        "Not authorized, token invalid or expired",
      );
      staff = status(
        await post("/auth/register", fixture("staff"), adminToken),
        201,
        "User registered successfully",
      );
      assert.equal(staff.role, "staff");
      assert.equal(String((await read(staff)).createdBy), admin._id);
      staffToken = status(await login(staff.email), 200).token;
      status(
        await post("/auth/register", fixture("forbidden"), staffToken),
        403,
        "Only admins can register new users",
      );
      status(
        await post("/auth/register", { email: "bad" }, staffToken),
        400,
        "Validation failed",
      );
      status(
        await post(
          "/auth/register",
          { ...fixture("duplicate-staff"), email: admin.email },
          staffToken,
        ),
        400,
        "User with this email already exists",
      );
      customer = status(
        await post("/auth/register", fixture("customer", { role: "customer" }), adminToken),
        201,
      );
      customerToken = status(await login(customer.email), 200).token;
    });
    await t.test(
      "A12/A13/A20 Zod mismatch, normalization, stripped fields and model validation",
      async () => {
        status(await post("/auth/login", { email: "bad", password }), 400, "Validation failed");
        status(
          await post("/auth/login", { email: ` ${admin.email} `, password }),
          400,
          "Validation failed",
        );
        status(
          await post("/auth/login", {
            email: admin.email.toUpperCase(),
            password,
            role: "customer",
          }),
          200,
        );
        status(
          await post("/auth/register", fixture("blank", { firstName: "   " }), adminToken),
          400,
          "First name is required",
        );
      },
    );
    await t.test("A02 unknown email login", async () => {
      status(await login(`${prefix}-absent@example.invalid`), 401, "Invalid email or password");
    });
    await t.test(
      "A03/A04/A05/A09/A84 five failures lock for fifteen minutes; tokens and hash survive",
      async () => {
        const before = await read(staff);
        for (let attempt = 1; attempt <= 5; attempt++) {
          const start = Date.now();
          const result = await post("/auth/login", { email: staff.email, password: "incorrect" });
          status(
            result,
            attempt === 5 ? 423 : 401,
            attempt === 5
              ? "Account locked due to too many failed attempts. Try again in 15 minutes."
              : `Invalid email or password. ${5 - attempt} attempt(s) remaining.`,
          );
          const user = await read(staff);
          assert.equal(user.failedLoginAttempts, attempt);
          assert.equal(user.password, before.password);
          if (attempt === 5)
            assert.ok(
              user.lockedUntil >= start + 900000 && user.lockedUntil <= Date.now() + 900000,
            );
        }
        const locked = await read(staff);
        status(await login(staff.email), 423, "Account locked. Try again in 15 minute(s).");
        assert.equal((await read(staff)).lockedUntil.getTime(), locked.lockedUntil.getTime());
        assert.equal((await read(staff)).failedLoginAttempts, 5);
        status(await request("/auth/me", { token: staffToken }), 200);
      },
    );
    await t.test(
      "A06/A07/A08 inactive ordering, expired-lock relock and success reset",
      async () => {
        await alter(staff, { isActive: false });
        status(await login(staff.email), 423);
        await alter(staff, { lockedUntil: new Date(Date.now() - 1000) });
        status(await login(staff.email), 403, "Account is deactivated. Contact admin.");
        status(
          await request("/auth/me", { token: staffToken }),
          401,
          "Not authorized, token invalid or expired",
        );
        assert.equal((await read(staff)).failedLoginAttempts, 5);
        await alter(staff, { isActive: true });
        status(await post("/auth/login", { email: staff.email, password: "incorrect" }), 423);
        assert.equal((await read(staff)).failedLoginAttempts, 6);
        await alter(staff, { lockedUntil: new Date(Date.now() - 1000) });
        status(await login(staff.email), 200);
        const user = await read(staff);
        assert.equal(user.failedLoginAttempts, 0);
        assert.equal(user.lockedUntil, undefined);
        assert.ok(user.lastLogin);
      },
    );
    await t.test("A27/A28/A29/A30 bearer quirks, expired/bad/absent identities", async () => {
      for (const header of ["", `bearer ${adminToken}`, "Bearer", `Bearer  ${adminToken}`]) {
        status(
          await request("/auth/me", { headers: { Authorization: header } }),
          401,
          "Not authorized, no token provided",
        );
      }
      status(
        await request("/auth/me", { headers: { Authorization: `BearerExtra ${adminToken}` } }),
        200,
      );
      const invalid = [
        "bad",
        jwt.sign({ id: admin._id }, randomBytes(32), { expiresIn: "1h" }),
        jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: -1 }),
        generateToken(new mongoose.Types.ObjectId()),
        generateToken("bad-id"),
      ];
      for (const token of invalid)
        status(
          await request("/auth/me", { token }),
          401,
          "Not authorized, token invalid or expired",
        );
    });
    await t.test(
      "A40 current user and unrestricted user detail include virtuals, never password",
      async () => {
        for (const token of [staffToken, customerToken]) {
          const me = status(await request("/auth/me", { token }), 200);
          assert.equal(me.fullName, "SyntheticAuth " + me.lastName);
          assert.equal(me.id, me._id);
          assert.equal(me.password, undefined);
          const detail = status(await request(`/users/${admin._id}`, { token }), 200);
          assert.equal(detail._id, admin._id);
          assert.equal(detail.password, undefined);
        }
      },
    );
    await t.test("A33/A34 logout does not revoke JWT", async () => {
      status(await post("/auth/logout", {}, staffToken), 200, "Logged out successfully");
      status(await request("/auth/me", { token: staffToken }), 200);
      status(await post("/auth/logout", {}), 401, "Not authorized, no token provided");
    });
    await t.test(
      "A35/A36/A37/A38 password-change rules, hashing and no counter/token reset",
      async () => {
        const before = await read(staff);
        for (const value of ["", "abcde", "abcdef", "abcdefg"]) {
          const message = !value
            ? "Both current and new passwords are required"
            : value.length < 6
              ? "New password must be at least 6 characters"
              : "Password must be at least 8 characters";
          status(
            await post(
              "/auth/change-password",
              { currentPassword: password, newPassword: value },
              staffToken,
            ),
            400,
            message,
          );
        }
        status(
          await post(
            "/auth/change-password",
            { currentPassword: "incorrect", newPassword: "lowercaseonly" },
            staffToken,
          ),
          401,
          "Current password is incorrect",
        );
        assert.equal((await read(staff)).password, before.password);
        await alter(staff, { failedLoginAttempts: 2 });
        status(
          await post(
            "/auth/change-password",
            { currentPassword: password, newPassword: "lowercaseonly" },
            staffToken,
          ),
          200,
          "Password changed successfully",
        );
        const after = await read(staff);
        assert.notEqual(after.password, before.password);
        assert.equal(after.failedLoginAttempts, 2);
        assert.ok(await bcrypt.compare("lowercaseonly", after.password));
        status(await request("/auth/me", { token: staffToken }), 200);
        status(await post("/auth/login", { email: staff.email, password: "lowercaseonly" }), 200);
      },
    );
    await t.test(
      "A60/A61/A62/A64/A65 admin verification ignores alternate email and admin lock",
      async () => {
        status(await post("/auth/verify-admin", {}, staffToken), 400, "Admin password is required");
        status(
          await post("/auth/verify-admin", { password }, staffToken),
          403,
          "Not authorized as admin. Please provide admin credentials.",
        );
        status(
          await post("/auth/verify-admin", { password: "incorrect" }, adminToken),
          401,
          "Invalid password",
        );
        const own = status(
          await post(
            "/auth/verify-admin",
            { password, adminEmail: "ignored@example.invalid" },
            adminToken,
          ),
          200,
          "Admin verification successful",
        );
        assert.deepEqual(own, { adminId: admin._id, adminName: "SyntheticAuth admin" });
        await alter(admin, { failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 900000) });
        const before = await read(admin);
        const other = status(
          await post("/auth/verify-admin", { password, adminEmail: admin.email }, staffToken),
          200,
        );
        assert.equal(other.adminId, admin._id);
        assert.equal((await read(admin)).updatedAt.getTime(), before.updatedAt.getTime());
        assert.equal((await read(admin)).failedLoginAttempts, 5);
        status(
          await post(
            "/auth/verify-admin",
            { password: "wrong", adminEmail: admin.email },
            staffToken,
          ),
          401,
          "Invalid admin credentials",
        );
        await alter(admin, { isActive: false });
        status(
          await post("/auth/verify-admin", { password, adminEmail: admin.email }, staffToken),
          401,
          "Invalid admin credentials",
        );
        await alter(admin, { isActive: true });
      },
    );
    await t.test(
      "A41/A42 soft-delete visibility, count discrepancy and regex filters",
      async () => {
        const hidden = await direct("hidden", { deletedAt: new Date(), role: "customer" });
        const hiddenToken = generateToken(hidden._id);
        status(
          await request("/auth/me", { token: hiddenToken }),
          401,
          "Not authorized, token invalid or expired",
        );
        status(await login(hidden.email), 401, "Invalid email or password");
        status(await request(`/users/${hidden._id}`, { token: adminToken }), 404, "User not found");
        const list = await request("/users?role=customer&search=^Synthetic&limit=1&page=1", {
          token: customerToken,
        });
        status(list, 200);
        assert.deepEqual(
          Object.keys(list.body).sort(),
          ["success", "count", "total", "data"].sort(),
        );
        assert.equal(list.body.count, 1);
        assert.equal(list.body.total, 2);
        const inactive = await direct("inactive", { isActive: false });
        const result = await request("/users?isActive=anything&search=inactive", {
          token: staffToken,
        });
        status(result, 200);
        assert.equal(result.body.data[0]._id, String(inactive._id));
        assert.equal(result.body.data[0].password, undefined);
      },
    );
    await t.test(
      "A32/A43/A70 all ten roles: reads allowed, user writes admin-only; permissions ignored",
      async () => {
        for (const role of User.schema.path("role").enumValues) {
          const actor = await direct(`role-${role}`, { role, permissions: ["manage_users"] });
          const token = generateToken(actor._id);
          status(await request("/users", { token }), 200);
          const result = await request(`/users/${customer._id}`, {
            method: "PUT",
            token,
            body: { phone: "123" },
          });
          status(
            result,
            role === "admin" ? 200 : 403,
            role === "admin" ? undefined : `Role '${role}' is not authorized for this action`,
          );
          if (role !== "admin")
            status(await request(`/users/${customer._id}`, { method: "DELETE", token }), 403);
        }
      },
    );
    await t.test(
      "A44 admin update uses exactly five fields and preserves password hash",
      async () => {
        const before = await read(customer);
        const result = await request(`/users/${customer._id}`, {
          method: "PUT",
          token: adminToken,
          body: {
            lastName: "updated",
            phone: " 555 ",
            role: "manager",
            isActive: true,
            email: "discard@example.invalid",
            password: "Discarded9",
            permissions: ["manage_users"],
            nic: "discard",
            address: "discard",
          },
        });
        const updated = status(result, 200);
        assert.equal(updated.lastName, "updated");
        assert.equal(updated.phone, "555");
        assert.equal(updated.role, "manager");
        assert.equal(updated.email, customer.email);
        assert.equal(updated.password, undefined);
        assert.equal(updated.nic, undefined);
        assert.deepEqual(updated.permissions, []);
        assert.equal((await read(customer)).password, before.password);
        status(
          await request(`/users/${customer._id}`, {
            method: "PUT",
            token: adminToken,
            body: { role: "unknown" },
          }),
          400,
        );
      },
    );
    await t.test(
      "A31/A45 own-role and own-deactivation changes immediately affect existing JWT",
      async () => {
        const actor = await direct("mutable-admin", { role: "admin" });
        const token = generateToken(actor._id);
        status(
          await request(`/users/${actor._id}`, { method: "PUT", token, body: { role: "staff" } }),
          200,
        );
        status(
          await request(`/users/${actor._id}`, { method: "PUT", token, body: { role: "admin" } }),
          403,
        );
        await alter(actor, { role: "admin" });
        status(
          await request(`/users/${actor._id}`, { method: "PUT", token, body: { isActive: false } }),
          200,
        );
        status(await request("/users", { token }), 401, "Not authorized, token invalid or expired");
      },
    );
    await t.test(
      "A46/A47 self-delete guard, permanent deletion, invalid and absent IDs",
      async () => {
        status(
          await request(`/users/${admin._id}`, { method: "DELETE", token: adminToken }),
          400,
          "Cannot delete yourself",
        );
        const actor = await direct("delete-me");
        const token = generateToken(actor._id);
        status(
          await request(`/users/${actor._id}`, { method: "DELETE", token: adminToken }),
          200,
          "User deleted permanently from database",
        );
        assert.equal(await User.collection.findOne({ _id: actor._id, email: actor.email }), null);
        status(await request("/users", { token }), 401, "Not authorized, token invalid or expired");
        for (const method of ["GET", "PUT", "DELETE"]) {
          status(
            await request("/users/bad-id", {
              method,
              token: adminToken,
              ...(method === "PUT" ? { body: {} } : {}),
            }),
            404,
            "Resource not found",
          );
          status(
            await request(`/users/${new mongoose.Types.ObjectId()}`, {
              method,
              token: adminToken,
              ...(method === "PUT" ? { body: {} } : {}),
            }),
            404,
            "User not found",
          );
        }
      },
    );
    await t.test(
      "A26/A80 JWT fallback and response helper characterization without exposing secrets",
      async () => {
        const lifetime = process.env.JWT_EXPIRES_IN;
        try {
          delete process.env.JWT_EXPIRES_IN;
          let decoded = verifyToken(generateToken(admin._id));
          assert.equal(decoded.exp - decoded.iat, 7 * 86400);
          process.env.JWT_EXPIRES_IN = "1h";
          decoded = verifyToken(generateToken(admin._id));
          assert.equal(decoded.exp - decoded.iat, 3600);
        } finally {
          if (lifetime === undefined) delete process.env.JWT_EXPIRES_IN;
          else process.env.JWT_EXPIRES_IN = lifetime;
        }
        const env = process.env.NODE_ENV;
        try {
          process.env.NODE_ENV = "production";
          const err = Object.assign(new Error("duplicate"), {
            code: 11000,
            keyValue: { email: "synthetic@example.invalid" },
          });
          const response = errorResponse(err, createResponse());
          assert.equal(response.status, 400);
          assert.deepEqual(await response.json(), {
            success: false,
            message: "Duplicate email: synthetic@example.invalid already exists",
            stack: null,
          });
          process.env.NODE_ENV = "development";
          assert.equal(
            typeof (await errorResponse(new Error("synthetic failure"), createResponse()).json())
              .stack,
            "string",
          );
          const res = createResponse();
          assert.throws(() => authorize({}, res, "admin"), /Not authorized/);
          assert.equal(res.statusCode, 401);
        } finally {
          if (env === undefined) delete process.env.NODE_ENV;
          else process.env.NODE_ENV = env;
        }
      },
    );
    await t.test(
      "A79 actual peer limiter is shared across auth routes, ignores spoofed IP and excludes users",
      async () => {
        let result = await request("/auth/me", { token: adminToken });
        status(result, 200);
        const remaining = Number(result.headers.get("ratelimit-remaining"));
        assert.ok(remaining > 0);
        result = await request("/auth/me", {
          token: adminToken,
          headers: { "X-Forwarded-For": "203.0.113.8" },
        });
        status(result, 200);
        assert.equal(Number(result.headers.get("ratelimit-remaining")), remaining - 1);
        assert.equal(result.headers.get("ratelimit-policy"), "100;w=900");
        assert.equal(result.headers.get("x-ratelimit-limit"), null);
        const left = Number(result.headers.get("ratelimit-remaining"));
        for (let i = 0; i < left; i++) status(await post("/auth/logout", {}, adminToken), 200);
        for (const path of [
          "/auth/me",
          "/auth/logout",
          "/auth/register",
          "/auth/login",
          "/auth/change-password",
          "/auth/verify-admin",
        ]) {
          const blocked = await request(path, {
            method: path === "/auth/me" ? "GET" : "POST",
            token: adminToken,
            ...(path === "/auth/me" ? {} : { body: {} }),
          });
          assert.equal(blocked.status, 429);
          assert.equal(blocked.body, "Too many login attempts, please try again later");
          assert.ok(Number(blocked.headers.get("retry-after")) > 0);
        }
        status(await request("/users", { token: adminToken }), 200);
      },
    );
    await t.test("no email index created or modified during authentication tests", async () => {
      const after = await User.collection.indexes();
      assert.deepEqual(
        after.filter((index) => index.name !== "_id_"),
        indexesBefore.filter((index) => index.name !== "_id_"),
      );
    });
  },
);

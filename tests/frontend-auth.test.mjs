import test from "node:test";
import assert from "node:assert/strict";
import { ERP_ROLES, PRICE_CHECKER_ROLES, getLoginDestination, getProtectedRouteDecision } from "../src/client/auth/access.js";
import { createAuthActions, initialAuthState } from "../src/client/auth/state.js";

test("role destinations and protected route decisions preserve the original gates", () => {
  assert.equal(getLoginDestination({ role: "customer" }), "/price-checker");
  assert.equal(getLoginDestination({ role: "admin" }), "/dashboard");
  assert.deepEqual(ERP_ROLES, ["admin", "manager", "accountant", "sales_manager", "sales_rep", "warehouse_staff", "production_staff", "inventory_admin", "staff"]);
  assert.deepEqual(PRICE_CHECKER_ROLES, ["customer", "admin", "manager", "inventory_admin", "staff"]);
  assert.equal(getProtectedRouteDecision({ isAuthenticated: false, user: null, allowedRoles: ERP_ROLES }), "login");
  assert.equal(getProtectedRouteDecision({ isAuthenticated: true, user: null, allowedRoles: ERP_ROLES }), "pending");
  assert.equal(getProtectedRouteDecision({ isAuthenticated: true, user: { role: "customer" }, allowedRoles: ERP_ROLES }), "unauthorized");
  assert.equal(getProtectedRouteDecision({ isAuthenticated: true, user: { role: "customer" }, allowedRoles: PRICE_CHECKER_ROLES }), "allow");
  assert.equal(getProtectedRouteDecision({ isAuthenticated: true, user: { role: "inventory_admin" }, allowedRoles: ERP_ROLES }), "allow");
});

test("persisted-auth actions retain the separate token storage behavior", () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  let state = { ...initialAuthState };
  const actions = createAuthActions((next) => { state = { ...state, ...next }; }, storage);
  const user = { _id: "synthetic", firstName: "Synthetic", role: "staff" };
  actions.login(user, "synthetic-token");
  assert.equal(values.get("token"), "synthetic-token");
  assert.deepEqual(state, { user, token: "synthetic-token", isAuthenticated: true });
  actions.updateUser({ ...user, firstName: "Updated" });
  assert.equal(state.token, "synthetic-token");
  actions.logout();
  assert.equal(values.has("token"), false);
  assert.deepEqual(state, initialAuthState);
});

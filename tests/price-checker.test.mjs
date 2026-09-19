import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PRICE_CHECKER_ROLES } from "../src/client/auth/access.js";

test("price checker preserves the original protected role boundary", () => {
  assert.deepEqual(PRICE_CHECKER_ROLES, ["customer", "admin", "manager", "inventory_admin", "staff"]);
});

test("price checker restores original product search, selection, and pricing presentation", async () => {
  const page = await readFile(new URL("../src/app/price-checker/page.jsx", import.meta.url), "utf8");

  assert.match(page, /useProducts\(\{ search, limit: 40 \}\)/);
  assert.match(page, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.match(page, /No results for/);
  assert.match(page, /Array\.from\(\{ length: 6 \}\)/);
  assert.match(page, /OFFICIAL WHOLESALE PRICE/);
  assert.match(page, /Bulk Price Tiers/);
  assert.match(page, /Manufacturer MRP/);
  assert.match(page, /onClick=\{logout\}/);
  assert.match(page, /<ProtectedRoute allowedRoles=\{PRICE_CHECKER_ROLES\}>/);
});

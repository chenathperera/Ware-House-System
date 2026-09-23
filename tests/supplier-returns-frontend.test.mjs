import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
test("Supplier Returns data layer preserves source endpoints, cache invalidation, and feedback", async () => {
  const api = await read("../src/client/features/supplierReturns/supplierReturnsApi.js");
  const hooks = await read("../src/client/features/supplierReturns/useSupplierReturns.js");
  for (const endpoint of ["/supplier-returns", "/send", "/record-credit"]) assert.ok(api.includes(endpoint));
  for (const key of ["supplierReturns", "supplierReturn", "stock"]) assert.ok(hooks.includes(key));
});
test("Supplier Returns pages preserve source-only actions and fields", async () => {
  const page = await read("../src/app/(erp)/supplier-returns/page.jsx");
  const detail = await read("../src/app/(erp)/supplier-returns/[id]/page.jsx");
  for (const value of ["New Supplier Return", "No supplier returns", "From Warehouse", "Total Return Value", "Add Line"]) assert.ok(page.includes(value));
  for (const value of ["Send Return (deduct stock)", "Record Supplier Credit", "Expected Credit", "Send Return to Supplier"]) assert.ok(detail.includes(value));
  assert.match(detail, /supplierReturn\.status === "draft"/);
  assert.match(detail, /supplierReturn\.status === "sent"/);
});

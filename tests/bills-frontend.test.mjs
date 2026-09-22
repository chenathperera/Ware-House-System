import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Bills client data layer preserves source endpoints, cache keys, and feedback", async () => {
  const api = await read("../src/client/features/bills/billsApi.js");
  const hooks = await read("../src/client/features/bills/useBills.js");
  for (const endpoint of ["/bills", "/bills/from-grn", "/bills/aging/summary"]) assert.ok(api.includes(endpoint));
  assert.match(hooks, /queryKey: \["bills", filters\]/);
  assert.match(hooks, /queryKey: \["bill", id\]/);
  assert.match(hooks, /queryKey: \["payablesAging"\]/);
  assert.match(hooks, /Bill created from GRN/);
});

test("Bills routes preserve source register, GRN creation, and detail dependency boundary", async () => {
  const list = await read("../src/app/(erp)/bills/page.jsx");
  const fromGrn = await read("../src/app/(erp)/bills/from-grn/page.jsx");
  const detail = await read("../src/app/(erp)/bills/[id]/page.jsx");
  for (const value of ["Supplier Bills", "Track what you owe suppliers", "Current", "1-30 days", "90+ days", "Search...", "No bills yet", "Bills are generated from GRNs when goods arrive"]) assert.ok(list.includes(value));
  for (const value of ["Create Bill from GRNs", "No GRNs", "Supplier Invoice Number", "Bill Discount (%)", "Create Bill"]) assert.ok(fromGrn.includes(value));
  assert.match(fromGrn, /enabled: !!poId/);
  assert.match(fromGrn, /globalDiscountAmount/);
  for (const value of ["Payment History", "Record Payment", "Balance Due", "/payments/new?billId="]) assert.ok(detail.includes(value));
  assert.match(detail, /api\.get\("\/payments"/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Repair Orders client preserves source endpoints, query keys, and cache invalidation", async () => {
  const api = await read("../src/client/features/repairs/repairsApi.js");
  const hooks = await read("../src/client/features/repairs/useRepairs.js");

  for (const endpoint of ["/repairs", "/repairs/${id}", "/repairs/${id}/start", "/repairs/${id}/complete"]) {
    assert.ok(api.includes(endpoint));
  }
  for (const key of ["repairs", "repair", "stock"]) assert.ok(hooks.includes(key));
  assert.match(hooks, /useStartRepair[\s\S]*repairsApi\.start/);
  assert.match(hooks, /useCompleteRepair[\s\S]*repairsApi\.complete[\s\S]*true/);
});

test("Repair Orders pages preserve lifecycle, Customer Return, costs, and completion contracts", async () => {
  const register = await read("../src/app/(erp)/repairs/page.jsx");
  const detail = await read("../src/app/(erp)/repairs/[id]/page.jsx");

  for (const label of ["Repairs Workshop", "Pending", "In Progress", "Awaiting Parts", "Fixed", "Unfixable", "No repairs"]) {
    assert.ok(register.includes(label));
  }
  for (const label of ["From Return:", "Start Repair", "Complete Repair", "Return to stock", "Return to customer", "Return to warehouse", "Labor hours", "Labor cost", "Parts cost"]) {
    assert.ok(detail.includes(label));
  }
  assert.match(detail, /start\.mutate\(\{ id: repair\._id, data: \{\} \}\)/);
  assert.match(detail, /outcome,\s*disposition,/);
  assert.match(detail, /returnedToWarehouseId: disposition === "return_to_stock" \? warehouseId : undefined/);
  assert.match(detail, /\["in_progress", "awaiting_parts"\]\.includes\(repair\.status\)/);
  assert.doesNotMatch(`${register}\n${detail}`, /Cancel Repair|Delete Repair|cancelRepair|deleteRepair/);
});

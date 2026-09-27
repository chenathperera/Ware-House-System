import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Production client preserves source endpoints, query keys, request payloads, and stock invalidation", async () => {
  const api = await read("../src/client/features/production/productionApi.js");
  const hooks = await read("../src/client/features/production/useProduction.js");
  for (const endpoint of ["/production-orders", "/approve", "/start", "/complete", "/hold", "/cancel"]) assert.ok(api.includes(endpoint));
  for (const key of ["productionOrders", "productionOrder", "stock", "stockMovements"]) assert.ok(hooks.includes(key));
  assert.match(hooks, /\(\{ id, data \}\) => productionApi\.complete\(id, data\)/);
});

test("Production pages preserve register, planning, lifecycle, completion, scrap, and navigation contracts", async () => {
  const register = await read("../src/app/(erp)/production-orders/page.jsx");
  const form = await read("../src/app/(erp)/production-orders/new/page.jsx");
  const detail = await read("../src/app/(erp)/production-orders/[id]/page.jsx");
  const modal = await read("../src/client/features/production/CompleteProductionModal.jsx");
  for (const label of ["Production Orders", "New Production Order", "No production orders"]) assert.ok(register.includes(label));
  for (const label of ["BOM (Recipe)", "Source Warehouse (raw materials)", "Material Shortage", "Create Order"]) assert.ok(form.includes(label));
  assert.match(form, /plannedQuantity: \+plannedQuantity/);
  assert.match(form, /\/production-orders\/\$\{result\.data\._id\}/);
  for (const label of ["Approve", "Start Production", "Complete Production", "Put on Hold", "Cancel", "Raw Materials to Consume", "Output"]) assert.ok(detail.includes(label));
  for (const label of ["Actual Materials Consumed", "Damaged", "Rejected", "Complete &amp; Update Stock"]) assert.ok(modal.includes(label) || detail.includes(label));
  assert.match(modal, /actualConsumption:/);
  assert.match(modal, /overheadCost:/);
});

test("Production material availability refreshes for the selected source warehouse and keeps sufficient stock out of shortages", async () => {
  const form = await read("../src/app/(erp)/production-orders/new/page.jsx");
  const bomHooks = await read("../src/client/features/boms/useBoms.js");
  assert.match(form, /useCheckAvailability\(\s*bomId,\s*plannedQuantity,\s*sourceWarehouseId,/);
  assert.match(bomHooks, /\["bomAvailability", id, quantity, sourceWarehouseId\]/);
  assert.match(form, /component\.isSufficient \? \(/);
  assert.match(form, /<Badge variant="success">OK<\/Badge>/);
  assert.match(form, /Short \{quantity\(component\.shortage\)\}/);
});

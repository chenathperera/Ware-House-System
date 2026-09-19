import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { warehouseFormSchema } from "../src/client/features/warehouses/warehouseSchemas.js";

test("original warehouse form schema retains its UI-only and API-facing field contract", () => {
  const form = warehouseFormSchema.safeParse({
    warehouseCode: "WH-1",
    name: "Main",
    type: "van",
    assignedRep: "rep-id",
    pickingStrategy: "FIFO",
  });

  assert.equal(form.success, true);
  assert.equal(
    warehouseFormSchema.safeParse({
      warehouseCode: "WH-1",
      name: "Main",
      type: "branch",
      pickingStrategy: "FIFO",
      zones: [{ code: "STG", name: "", type: "storage" }],
    }).success,
    false,
  );
});

test("warehouse page and dedicated modal retain original filters, management actions, and form sections", async () => {
  const page = await readFile(new URL("../src/app/(erp)/warehouses/page.jsx", import.meta.url), "utf8");
  const modal = await readFile(
    new URL("../src/client/features/warehouses/WarehouseFormModal.jsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /placeholder="Search\.\.\."/);
  assert.match(page, /placeholder="All Types"/);
  assert.match(page, /Can't delete default/);
  assert.match(page, /WarehouseFormModal/);
  assert.match(modal, /Warehouse Manager/);
  assert.match(modal, /Assigned Sales Rep/);
  assert.match(modal, /Capabilities/);
  assert.match(modal, /Zones/);
  assert.match(modal, /Picking Strategy/);
});

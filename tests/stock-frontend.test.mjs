import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Stock data layer retains original endpoints, query keys, placeholder data, feedback, and invalidation", async () => {
  const api = await read("../src/client/features/stock/stockApi.js");
  const hooks = await read("../src/client/features/stock/useStock.js");
  for (const path of [
    "/stock",
    "/stock/by-product/${productId}",
    "/stock/movements",
    "/stock/reservations",
    "/stock/opening",
    "/stock/transfer",
    "/stock/adjustment",
  ])
    assert.match(api, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(hooks, /queryKey: \["stock", filters\]/);
  assert.match(hooks, /queryKey: \["stockMovements", filters\]/);
  assert.match(hooks, /placeholderData/);
  assert.match(hooks, /invalidateQueries\(\{ queryKey: \["stock"\] \}\)/);
  assert.match(
    hooks,
    /invalidateQueries\(\{ queryKey: \["stockMovements"\] \}\)/,
  );
  assert.match(hooks, /error\.response\?\.data\?\.message \|\| "Failed"/);
});

test("Stock overview and movement history preserve source cards, filters, columns, pages, states, and role visibility", async () => {
  const stock = await read("../src/app/(erp)/stock/page.jsx");
  const movements = await read("../src/app/(erp)/stock/movements/page.jsx");
  for (const value of [
    "Stock Overview",
    "Current inventory across all warehouses",
    "Total Items",
    "Total Value (page)",
    "Warehouses",
    "Low stock",
    "Search product...",
    "On Hand",
    "Reserved",
    "Available",
    "Unit Cost",
    "Stock Value",
    "No stock data",
    "Enter Opening Stock",
  ])
    assert.ok(stock.includes(value), `Missing ${value}`);
  assert.match(stock, /\["admin", "manager", "warehouse_staff"\]/);
  assert.match(stock, /Pagination/);
  for (const value of [
    "Stock Movements",
    "Complete audit trail of every stock change",
    "Ref #",
    "Opening Stock",
    "Transfer Out",
    "Adjustment (+)",
    "No movements yet",
    "All Types",
    "All Warehouses",
  ])
    assert.ok(movements.includes(value), `Missing ${value}`);
});

test("Opening, adjustment, and transfer forms retain original workflow-specific fields and feedback", async () => {
  const opening = await read("../src/app/(erp)/stock/opening/page.jsx");
  const adjustment = await read("../src/app/(erp)/stock/adjustment/page.jsx");
  const transfer = await read("../src/app/(erp)/stock/transfer/page.jsx");
  for (const value of [
    "Opening Stock Entry",
    "Target Warehouse",
    "Stock Items",
    "Total value",
    "Save Opening Stock",
    "Select warehouse",
    "Add at least one item",
    "costPerUnit",
  ])
    assert.match(opening, new RegExp(value));
  for (const value of [
    "Stock Adjustment",
    "physical_count",
    "Would go negative",
    "Save Adjustment",
    "Access Restricted",
    "Authorize Stock Adjustment",
    "adjustmentQuantity",
  ])
    assert.match(adjustment, new RegExp(value));
  for (const value of [
    "Stock Transfer",
    "From Warehouse",
    "To Warehouse",
    "Available:",
    "Max ",
    "Execute Transfer",
    "Source and destination must differ",
    "fromWarehouseId",
    "toWarehouseId",
  ])
    assert.match(transfer, new RegExp(value));
});

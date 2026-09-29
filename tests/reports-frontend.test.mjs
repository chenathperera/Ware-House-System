import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Reports frontend retains the source-backed hub, routes, charts, and exports", async () => {
  const hub = await read("../src/components/reports/ReportsHub.jsx");
  const sales = await read("../src/components/reports/SalesReports.jsx");
  const inventory = await read("../src/components/reports/InventoryReports.jsx");
  const operations = await read("../src/components/reports/OperationsReports.jsx");
  const api = await read("../src/client/features/reports/reportsApi.js");
  const hooks = await read("../src/client/features/reports/useReports.js");

  for (const label of [
    "Sales",
    "Inventory",
    "Production",
    "Returns & Damages",
    "Financial",
    "Human Resources",
    "Sales Summary",
    "Financial Snapshot",
    "HR Reports",
  ]) assert.ok(hub.includes(label), label);
  for (const route of [
    "/reports/sales",
    "/reports/sales-by-product",
    "/reports/sales-by-customer",
    "/reports/stock-valuation",
    "/reports/slow-fast-movers",
    "/reports/inventory/low-stock",
    "/reports/stock-movement",
    "/reports/production",
    "/reports/returns-damages",
    "/reports/financial",
    "/reports/hr",
  ]) assert.ok(hub.includes(route), route);
  assert.ok(!hub.includes("profit-and-loss"));
  assert.ok(!hub.includes("Profit & Loss"));

  for (const endpoint of [
    "/reports/sales/summary",
    "/reports/inventory/valuation",
    "/reports/production/summary",
    "/reports/returns/summary",
    "/reports/damages/summary",
    "/reports/financial/snapshot",
    "/reports/hr/payroll-summary",
  ]) assert.ok(api.includes(endpoint), endpoint);
  for (const hook of [
    "useSalesSummary",
    "useStockValuation",
    "useProductionSummary",
    "useReturnsSummary",
    "useFinancialSnapshot",
    "useHeadcountReport",
  ]) assert.ok(hooks.includes(hook), hook);

  assert.match(sales, /LineChart/);
  assert.match(inventory, /PieChart/);
  assert.match(inventory, /value: item\._id/);
  assert.match(inventory, /warehouseId: warehouseId \|\| undefined/);
  assert.match(operations, /PieChart/);
  const production = operations.slice(
    operations.indexOf("export function ProductionReport"),
    operations.indexOf("export function ReturnsReport"),
  );
  assert.match(production, /Production by Product/);
  assert.doesNotMatch(production, /\bhead\b/);
  for (const filename of [
    "sales-by-product-${startDate}-to-${endDate}.csv",
    "sales-by-customer-${startDate}-to-${endDate}.csv",
    "stock-valuation-${today()}.csv",
  ]) assert.ok(`${sales}\n${inventory}`.includes(filename), filename);
  assert.equal((`${sales}\n${inventory}\n${operations}`.match(/Export CSV/g) || []).length, 3);
});

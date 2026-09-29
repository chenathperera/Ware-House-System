import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
test("Dashboard retains source-backed routes, metrics, chart, lists, alerts, and actions", async () => {
  const dashboard = await read("../src/components/dashboard/Dashboard.jsx");
  const root = await read("../src/app/(erp)/page.jsx");
  const api = await read("../src/client/features/reports/reportsApi.js");
  for (const label of ["Revenue", "Gross Profit", "Net Cash Flow", "Orders Today", "Receivables", "Low Stock", "Pending Approvals", "Pending Dispatch", "Active Production", "Active Customers", "Revenue Trend (Last 6 Months)", "Quick Actions", "Top Products This Month", "Top Customers This Month", "Low Stock Alerts"]) assert.ok(dashboard.includes(label), label);
  for (const href of ["/sales-orders/new", "/payments/new", "/purchase-orders/new", "/reports"]) assert.ok(dashboard.includes(href), href);
  for (const endpoint of ["/reports/dashboard/kpis", "/reports/dashboard/revenue-chart", "/reports/dashboard/top-products", "/reports/dashboard/top-customers"]) assert.ok(api.includes(endpoint), endpoint);
  assert.match(dashboard, /LineChart/); assert.match(dashboard, /lowStockItems\?\.length > 0/); assert.match(root, /Dashboard/);
});

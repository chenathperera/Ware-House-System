import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Sales navigation preserves the original Payments Received entry", async () => {
  const sidebar = await read("../src/components/layout/Sidebar.jsx");
  const paymentsPage = await read("../src/app/(erp)/payments/page.jsx");
  const sales = sidebar.match(
    /label: "Sales",[\s\S]*?children: \[([\s\S]*?)\],\n  \},\n  \{\n    label: "Inventory"/,
  )?.[1];

  assert.ok(sales, "the Sales navigation group must exist");
  assert.match(sales, /\["Payments Received", "\/payments"\]/);
  assert.ok(
    sales.indexOf('["Invoices", "/invoices"]') <
      sales.indexOf('["Payments Received", "/payments"]'),
    "Payments Received must follow Invoices",
  );
  assert.ok(
    sales.indexOf('["Payments Received", "/payments"]') <
      sales.indexOf('["Customer Returns", "/returns"]'),
    "Payments Received must precede Customer Returns",
  );
  assert.doesNotMatch(
    sales.match(/\["Payments Received"[^\n]*/)?.[0] || "",
    /true|admin/i,
    "Payments Received must remain visible to every authenticated sidebar role",
  );
  assert.match(paymentsPage, /export default function PaymentsPage/);
});

test("Sales children retain source-equivalent active state styling", async () => {
  const sidebar = await read("../src/components/layout/Sidebar.jsx");

  assert.match(
    sidebar,
    /pathname === path \? "text-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"/,
  );
  assert.match(
    sidebar,
    /item\.children\?\.filter\(\(\[, , admin\]\) => !admin \|\| userRole === "admin"\)/,
  );
});

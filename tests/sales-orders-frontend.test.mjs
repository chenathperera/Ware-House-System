import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Sales Orders client contracts preserve source endpoints, query keys, mutations, and cache effects", async () => {
  const api = await read("../src/client/features/salesOrders/salesOrdersApi.js");
  const hooks = await read("../src/client/features/salesOrders/useSalesOrders.js");
  const invoiceApi = await read("../src/client/features/invoices/invoicesApi.js");

  for (const endpoint of ["/sales-orders", "/sales-orders/${id}", "/sales-orders/${id}/status"]) assert.ok(api.includes(endpoint));
  assert.match(api, /api\.patch\(`\/sales-orders\/\$\{id\}\/status`, \{ status, reason \}\)/);
  assert.match(hooks, /queryKey: \["salesOrders", filters\]/);
  assert.match(hooks, /queryKey: \["salesOrder", id\]/);
  assert.match(hooks, /\["salesOrders", "invoices", "invoicesAging", "stock", "dashboard", "pos-sessions"\]/);
  assert.match(hooks, /toast\.success\("Order created"\)/);
  assert.match(hooks, /toast\.success\("Order deleted"\)/);
  assert.match(invoiceApi, /api\.post\("\/invoices\/from-sales-order", data\)/);
});

test("Sales Orders pages preserve source list, lifecycle, stock, and invoice UI contracts", async () => {
  const register = await read("../src/app/(erp)/sales-orders/page.jsx");
  const form = await read("../src/app/(erp)/sales-orders/new/page.jsx");
  const detail = await read("../src/app/(erp)/sales-orders/[id]/page.jsx");
  const invoice = await read("../src/app/(erp)/invoices/from-sales-order/page.jsx");
  for (const source of [register, form, detail, invoice]) assert.ok(source.length > 0);
  for (const label of ["Sales Orders", "POS Mode", "Detailed Order", "Search by order number or customer...", "Delete this draft order?"]) assert.ok(register.includes(label));
  for (const label of ["Customer & Delivery", "Source Warehouse", "Line Items", "Order Discount %", "Create & Approve", "Save as Draft"]) assert.ok(form.includes(label));
  assert.match(form, /status: saveAsDraft \? "draft" : "approved"/);
  for (const label of ["Approve", "Mark Dispatched", "Mark Delivered", "Mark Completed", "Create Invoice", "Cancel", "Please provide a reason:"]) assert.ok(detail.includes(label));
  assert.match(detail, /\/invoices\/from-sales-order\?orderIds=/);
  assert.match(invoice, /status: "delivered", limit: 200/);
  assert.match(invoice, /All selected orders must be from the same customer/);
});

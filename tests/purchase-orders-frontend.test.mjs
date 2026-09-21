import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Purchase Order data layer preserves endpoints, cache behavior, invalidation, and feedback", async () => {
  const api = await read("../src/client/features/purchaseOrders/purchaseOrdersApi.js");
  const hooks = await read("../src/client/features/purchaseOrders/usePurchaseOrders.js");

  for (const endpoint of [
    "/purchase-orders",
    "/purchase-orders/${id}",
    "/purchase-orders/${id}/status",
  ]) {
    assert.ok(api.includes(endpoint), `Missing ${endpoint}`);
  }
  assert.match(api, /api\.get\("\/purchase-orders", \{ params \}\)/);
  assert.match(api, /api\.put\(`\/purchase-orders\/\$\{id\}`, data\)/);
  assert.match(api, /api\.patch\(`\/purchase-orders\/\$\{id\}\/status`, \{ status, reason \}\)/);
  assert.match(hooks, /queryKey: \["purchaseOrders", filters\]/);
  assert.match(hooks, /queryKey: \["purchaseOrder", id\]/);
  assert.match(hooks, /placeholderData: \(previous\) => previous/);
  assert.match(hooks, /enabled: !!id/);
  assert.match(hooks, /toast\.success\("PO created"\)/);
  assert.match(hooks, /toast\.success\("PO updated"\)/);
  assert.match(hooks, /toast\.success\(data\.message\)/);
  assert.match(hooks, /toast\.success\(data\.message \|\| "PO deleted"\)/);
  assert.match(hooks, /invalidateQueries\(\{ queryKey: \["purchaseOrders"\] \}\)/);
  assert.match(hooks, /invalidateQueries\(\{ queryKey: \["purchaseOrder"\] \}\)/);
});

test("Purchase Order register preserves headings, filters, table columns, states, visibility, and receipt progress", async () => {
  const page = await read("../src/app/(erp)/purchase-orders/page.jsx");

  for (const value of [
    "Purchase Orders",
    "Buy stock from suppliers",
    "New PO",
    "Search by PO number or supplier...",
    "All Statuses",
    "PO #",
    "Date",
    "Supplier",
    "Deliver To",
    "Items",
    "Total",
    "Received",
    "No purchase orders",
    "Create your first PO",
    "Loading...",
    "Pagination",
  ]) {
    assert.ok(page.includes(value), `Missing ${value}`);
  }
  assert.match(page, /\["admin", "manager", "accountant"\]\.includes\(user\?\.role\)/);
  assert.match(page, /\["draft", "pending_approval"\]\.includes\(row\.status\)/);
  assert.match(page, /row\.status === "draft"/);
  assert.match(page, /window\.confirm\("Delete this draft PO\?"\)/);
  assert.match(page, /receiptCompletionPercent \|\| 0/);
  assert.match(page, /style=\{\{ width: `\$\{row\.receiptCompletionPercent \|\| 0\}%` \}\}/);
});

test("Purchase Order form preserves source-backed fields, calculation order, validation, payload, and edit hydration", async () => {
  const form = await read("../src/client/features/purchaseOrders/PurchaseOrderForm.jsx");

  for (const value of [
    "Supplier & Delivery",
    "PO Date",
    "Expected Delivery Date",
    "Shipping Terms",
    "Shipping",
    "Other Charges",
    "Notes to Supplier",
    "Internal Notes",
    "Add Item",
    "Disc %",
    "Disc Amt",
    "Tax %",
    "Line Total",
    "Subtotal",
    "Discount",
    "Grand Total",
    "Create & Approve",
    "Save as Draft",
    "Edit Purchase Order",
    "Update Purchase Order",
    "This purchase order can no longer be edited.",
  ]) {
    assert.ok(form.includes(value), `Missing ${value}`);
  }
  assert.match(form, /subtotal \* \(\+item\.discountPercent \|\| 0\) \/ 100 \+ \(\+item\.discountAmount \|\| 0\)/);
  assert.match(form, /const taxableAmount = item\.taxable \? subtotal - discount : 0/);
  assert.match(form, /const tax = taxableAmount \* \(\+item\.taxRate \|\| 0\) \/ 100/);
  assert.match(form, /product\.costs\?\.lastPurchaseCost \|\| 0/);
  assert.match(form, /product\.tax\?\.taxRate \|\| 0/);
  assert.match(form, /toast\.error\("Select a supplier"\)/);
  assert.match(form, /toast\.error\("Select a delivery warehouse"\)/);
  assert.match(form, /toast\.error\("Add at least one item"\)/);
  assert.match(form, /toast\.error\("Each item needs a product and quantity"\)/);
  assert.match(form, /supplierId: header\.supplierId/);
  assert.match(form, /deliverTo: \{ warehouseId: header\.warehouseId \}/);
  assert.match(form, /discountAmount: \+item\.discountAmount \|\| 0/);
  assert.match(form, /\["draft", "pending_approval"\]\.includes\(po\.status\)/);
  assert.match(form, /updateMutation\.mutateAsync\(\{ id: purchaseOrderId, data \}\)/);
  assert.match(form, /disabled=\{!header\.supplierId \|\| !header\.warehouseId \|\| items\.length === 0\}/);
});

test("Purchase Order detail preserves source snapshots, lines, totals, action visibility, and confirmation behavior", async () => {
  const page = await read("../src/app/(erp)/purchase-orders/[id]/page.jsx");

  for (const value of [
    "Supplier & Delivery",
    "VAT:",
    "Expected:",
    "Receipt:",
    "Product",
    "Ordered",
    "Received",
    "Pending",
    "Price",
    "Total",
    "Status",
    "Subtotal",
    "Discount",
    "Tax",
    "Shipping",
    "Other",
    "PO Date",
    "Payment",
    "Due Date",
    "Notes",
    "Approve",
    "Mark Sent",
    "Cancel",
    "Close PO",
    "Please provide a reason:",
  ]) {
    assert.ok(page.includes(value), `Missing ${value}`);
  }
  assert.match(page, /po\.deliverTo\?\.address\?\.line1/);
  assert.match(page, /po\.shippingTerms/);
  assert.match(page, /po\.otherCharges > 0/);
  assert.match(page, /\["admin", "manager", "accountant"\]\.includes\(user\?\.role\)/);
  assert.match(page, /\["draft", "pending_approval"\]\.includes\(po\.status\)/);
  assert.match(page, /po\.status === "approved"/);
  assert.match(page, /\["partially_received", "fully_received"\]\.includes\(po\.status\)/);
  assert.match(page, /!\["closed", "cancelled", "fully_received"\]\.includes\(po\.status\)/);
  assert.match(page, /changeStatus\.mutateAsync\(\{ id: po\._id, status: action\.status, reason \}\)/);
  assert.match(page, /onClose=\{\(\) => \{ setAction\(null\); setReason\(""\); \}\}/);
});

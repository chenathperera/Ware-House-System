import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("GRN data layer preserves source endpoints, cache keys, invalidation, and feedback", async () => {
  const api = await read("../src/client/features/grns/grnsApi.js");
  const hooks = await read("../src/client/features/grns/useGrns.js");
  for (const endpoint of ["/grns", "/grns/${id}"]) assert.ok(api.includes(endpoint));
  assert.match(api, /api\.get\("\/grns", \{ params \}\)/);
  assert.match(api, /api\.post\("\/grns", data\)/);
  assert.match(api, /api\.delete\(`\/grns\/\$\{id\}`\)/);
  assert.match(hooks, /queryKey: \["grns", filters\]/);
  assert.match(hooks, /queryKey: \["grn", id\]/);
  assert.match(hooks, /placeholderData: \(previous\) => previous/);
  assert.match(hooks, /enabled: !!id/);
  assert.match(hooks, /queryKey: \["purchaseOrders"\]/);
  assert.match(hooks, /queryKey: \["purchaseOrder"\]/);
  assert.match(hooks, /queryKey: \["stock"\]/);
  assert.match(hooks, /"Cancellation failed"/);
});

test("GRN register preserves original heading, list contract, search, columns, states, pagination, and cancellation", async () => {
  const page = await read("../src/app/(erp)/grns/page.jsx");
  for (const value of ["Goods Received Notes", "View and record incoming goods (GRNs)", "New Direct GRN", "Search by GRN number...", "GRN #", "Date", "Supplier", "Warehouse", "PO #", "Total Value", "Status", "Direct", "Loading...", "No goods received notes", "Pagination", "Cancel GRN"]) assert.ok(page.includes(value), `Missing ${value}`);
  assert.match(page, /row\.status !== "cancelled"/);
  assert.ok(page.includes("Cancel GRN ${row.grnNumber}? Stock will be reversed."));
  assert.match(page, /cancel\.mutate\(row\._id\)/);
  assert.match(page, /page: 1/);
});

test("Direct GRN form preserves source fields, validation, payload, discounts, and displayed totals", async () => {
  const form = await read("../src/client/features/grns/DirectGrnModal.jsx");
  for (const value of ["New Direct GRN (No PO)", "Supplier", "Warehouse", "Items", "Product...", "Qty", "Unit Price", "Free Qty", "Disc(%)", "Disc(Rs)", "Bill Discount (%)", "Bill Discount (Rs)", "Subtotal:", "Line Discounts:", "Grand Total:", "Confirm Receipt", "Select supplier and warehouse", "Add at least one item"]) assert.ok(form.includes(value), `Missing ${value}`);
  assert.match(form, /acceptedQuantity: \+item\.receivedQuantity/);
  assert.match(form, /freeQuantity: \+item\.freeQuantity \|\| 0/);
  assert.match(form, /discountPercent: \+item\.discountPercent \|\| 0/);
  assert.match(form, /calculateReceiptTotals/);
});

test("PO receipt modal preserves source hydration, pending defaults, quantities, references, and validation", async () => {
  const modal = await read("../src/client/features/grns/PurchaseOrderGrnModal.jsx");
  for (const value of ["Receive Goods — PO", "Supplier Delivery Note #", "Supplier Invoice #", "Vehicle Number", "Driver Name", "Ordered:", "Already received:", "Pending:", "Received Qty", "Rejected Qty", "Accepted", "Batch #", "Expiry", "Rejection Reason", "At least one item must be received"]) assert.ok(modal.includes(value), `Missing ${value}`);
  assert.match(modal, /item\.orderedQuantity - \(item\.receivedQuantity \|\| 0\)/);
  assert.match(modal, /poLineItemId: item\._id/);
  assert.match(modal, /purchaseOrderId: purchaseOrder\._id/);
  assert.match(modal, /warehouseId: purchaseOrder\.deliverTo/);
  assert.match(modal, /acceptedQuantity = Math\.max\(0, received - rejected\)/);
});

test("PO detail restores source receive action and limits it to receive-capable roles and statuses", async () => {
  const detail = await read("../src/app/(erp)/purchase-orders/[id]/page.jsx");
  assert.match(detail, /\["admin", "manager", "warehouse_staff"\]\.includes\(user\?\.role\)/);
  assert.match(detail, /\["approved", "sent", "partially_received"\]\.includes\(po\.status\)/);
  assert.match(detail, /label: "Receive Goods"/);
  assert.match(detail, /PurchaseOrderGrnModal/);
});

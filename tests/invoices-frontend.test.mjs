import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Invoice client hooks preserve API mutations, cache refreshes, and feedback", async () => {
  const api = await read("../src/client/features/invoices/invoicesApi.js");
  const hooks = await read("../src/client/features/invoices/useInvoices.js");

  for (const endpoint of ["/invoices", "api.post", "api.patch", "api.delete"]) {
    assert.ok(api.includes(endpoint));
  }

  assert.match(hooks, /queryKey: \["invoices", filters\]/);
  assert.match(hooks, /queryKey: \["invoice", id\]/);
  assert.match(hooks, /Invoice created/);
  assert.match(hooks, /Status updated/);
  assert.match(hooks, /toast\.error/);
});

test("Invoice register preserves source search, status, navigation, and pagination workflows", async () => {
  const page = await read("../src/app/(erp)/invoices/page.jsx");

  for (const value of [
    "Invoices",
    "Track customer invoices and payments",
    "Manual Invoice",
    "Search invoices...",
    "All Payment Statuses",
    "Loading...",
    "No invoices",
    "Create a manual invoice to get started.",
    "Invoice #",
    "Customer",
    "Payment",
    "Status",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /href=\{`\/invoices\/\$\{invoice\._id\}`\}/);
  assert.match(page, /updateFilter\("search", event\.target\.value\)/);
  assert.match(page, /updateFilter\("paymentStatus", event\.target\.value\)/);
  assert.match(page, /<Pagination/);
  assert.match(page, /totalPages=\{data\?\.totalPages \|\| 1\}/);
});

test("Manual Invoice page preserves active lookup, product hydration, validation, totals, and create navigation", async () => {
  const page = await read("../src/app/(erp)/invoices/new/page.jsx");

  for (const value of [
    'status: "active", limit: 500',
    "Customer & Dates",
    "Invoice Date",
    "Due Date",
    "Line Items",
    "Product (or type below for service)...",
    "Description / Name",
    "Qty",
    "Unit Price",
    "Invoice Notes",
    "Payment Instructions",
    "Shipping",
    "Create Invoice",
    "Select customer",
    "All items need a name and quantity",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /next\.productName = product\.name/);
  assert.match(page, /next\.productCode = product\.productCode/);
  assert.match(page, /next\.unitPrice = product\.basePrice/);
  assert.match(page, /next\.unitOfMeasure = product\.unitOfMeasure/);
  assert.match(page, /const subtotal = items\.reduce/);
  assert.match(page, /discountType === "percentage"/);
  assert.match(page, /createInvoice\.mutateAsync/);
  assert.match(page, /router\.push\(`\/invoices\/\$\{result\.data\._id\}`\)/);
  assert.match(page, /loading=\{loading\}/);
  assert.match(page, /disabled=\{disabled\}/);
});

test("Invoice detail preserves loading, invoice data, status actions, and receipt navigation", async () => {
  const page = await read("../src/app/(erp)/invoices/[id]/page.jsx");

  for (const value of [
    "Loading...",
    "Invoice not found",
    "Customer",
    "Due Date",
    "Item",
    "Qty",
    "Price",
    "Discount",
    "Tax",
    "Total",
    "Subtotal",
    "Shipping",
    "Other Charges",
    "Grand Total",
    "Amount Paid",
    "Balance Due",
    "Notes",
    "Payment Instructions",
    "Mark Sent",
    "Cancel",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /invoice\.customerSnapshot\?\.name/);
  assert.match(page, /item\.unitOfMeasure/);
  assert.match(page, /invoice\.status === "approved"/);
  assert.match(page, /updateStatus\("sent"\)/);
  assert.match(page, /updateStatus\("cancelled"\)/);
  assert.match(page, /href=\{`\/receipt\/\$\{invoice\._id\}`\}/);
});

test("Invoice receipt preserves source company settings, invoice totals, footer, and browser printing", async () => {
  const page = await read("../src/app/receipt/[id]/page.jsx");

  for (const value of [
    "Loading receipt...",
    "Invoice not found",
    "YOUR COMPANY NAME",
    "receiptFooterMessage",
    "THANK YOU FOR YOUR BUSINESS!",
    "Receipt No:",
    "Customer:",
    "Description",
    "Subtotal",
    "Shipping",
    "Other Charges",
    "TOTAL",
    "Paid Amount",
    "Amount Due",
    "Print Receipt",
    "invoice.notes",
    "invoice.paymentInstructions",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /useCompanySettings\(\)/);
  assert.match(page, /settings\.companyName/);
  assert.match(page, /settings\.address/);
  assert.match(page, /settings\.phone/);
  assert.match(page, /settings\.email/);
  assert.match(page, /settings\.taxRegistrationNumber/);
  assert.match(page, /receipt-wrapper print-thermal-container/);
  assert.match(page, /item\.unitOfMeasure/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /setTimeout\(\(\) => \{\s*window\.print\(\);\s*\}, 600\)/);
  assert.match(page, /footer\.split\("\\n"\)/);
});

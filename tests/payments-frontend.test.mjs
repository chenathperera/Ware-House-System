import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Payment client API and hooks preserve endpoints, query keys, mutations, and cache refreshes", async () => {
  const api = await read("../src/client/features/payments/paymentsApi.js");
  const hooks = await read("../src/client/features/payments/usePayments.js");

  for (const value of ["/payments", "api.get", "api.post", "api.delete"]) {
    assert.ok(api.includes(value));
  }

  assert.match(hooks, /queryKey: \["payments", filters\]/);
  assert.match(hooks, /queryKey: \["payment", id\]/);

  // Source-parity cache invalidation coverage.
  assert.match(hooks, /"invoices"/);
  assert.match(hooks, /"invoicesAging"/);
  assert.match(hooks, /"bills"/);
  assert.match(hooks, /"customers"/);
  assert.match(hooks, /"dashboard"/);
  assert.match(hooks, /"bank-accounts"/);
  assert.match(hooks, /"cheques"/);

  // Source-parity success and error feedback.
  assert.match(hooks, /Payment recorded/);
  assert.match(hooks, /Payment deleted/);
  assert.match(hooks, /"Failed"/);
  assert.match(hooks, /"Delete failed"/);
  assert.match(hooks, /toast\.error/);
});

test("Payment register preserves loading, empty state, filters, pagination, and detail navigation", async () => {
  const page = await read("../src/app/(erp)/payments/page.jsx");

  for (const value of [
    "Payments",
    "Loading...",
    "No payments",
    "Record Payment",
    "All Types",
    "All Methods",
    "Ref #",
    "Party",
    "Amount",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /updateFilter\("direction", event\.target\.value\)/);
  assert.match(page, /updateFilter\("method", event\.target\.value\)/);
  assert.match(page, /<Pagination/);
  assert.match(page, /href=\{`\/payments\/\$\{payment\._id\}`\}/);
});

test("Payment creation preserves paid and received workflows, allocations, metadata, validation, and navigation", async () => {
  const page = await read("../src/app/(erp)/payments/new/page.jsx");

  for (const value of [
    "Money Received",
    "Money Paid",
    "Customer",
    "Supplier",
    "Apply to Invoices/Bills",
    "Payment Date",
    "Select Bank Account",
    "Cheque Number",
    "Cheque Date",
    "Bank Name (optional)",
    "Transaction Reference (optional)",
    "Unallocated:",
    "Enter amount",
    "Select customer",
    "Select supplier",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /queryKey: \["supplierBills", supplierId\]/);
  assert.match(page, /queryKey: \["customerInvoices", customerId\]/);
  assert.match(page, /handleAllocationAmountChange/);
  assert.match(page, /method === "cheque"/);
  assert.match(page, /bankAccountId: bankAccountId \|\| undefined/);
  assert.match(
    page,
    /router\.push\(`\/payments\/\$\{result\.data\._id\}`\)/,
  );
});

test("Payment detail preserves metadata, allocations, bank and cheque details, delete confirmation, and navigation", async () => {
  const page = await read("../src/app/(erp)/payments/[id]/page.jsx");

  for (const value of [
    "Loading...",
    "Details",
    "Method:",
    "Cheque:",
    "Cheque Date:",
    "Linked Bank Account:",
    "Ref:",
    "Applied To",
    "Summary",
    "Allocated:",
    "Unallocated:",
    "Delete",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /window\.confirm/);
  assert.match(page, /remove\.mutateAsync\(id\)/);
  assert.match(page, /router\.push\("\/payments"\)/);
  assert.match(
    page,
    /href=\{`\/\$\{allocation\.documentType\}s\/\$\{allocation\.documentId\}`\}/,
  );
});
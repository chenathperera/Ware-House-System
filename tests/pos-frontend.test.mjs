import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("POS routes retain the source-backed terminal, session, and receipt flow", async () => {
  const [terminal, sessions, receipt] = await Promise.all([
    readFile(new URL("../src/app/(erp)/pos/page.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(erp)/pos-sessions/page.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/receipt/[id]/page.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(terminal, /pos-sessions/);
  assert.match(terminal, /source: "pos"/);
  assert.match(terminal, /cashReceived/);
  assert.match(terminal, /changeReturned/);
  assert.match(terminal, /Open Cash Register/);
  assert.match(terminal, /Close Cash Register/);
  assert.match(terminal, /\/receipt\/\$\{result\.invoiceId\}/);
  assert.match(sessions, /Expected Bal/);
  assert.match(sessions, /Discrepancy/);
  assert.match(receipt, /window\.print\(\)/);
  assert.match(receipt, /@media print/);
});

test("POS quick customer creation preserves the source modal workflow", async () => {
  const [terminal, modal, customerState] = await Promise.all([
    readFile(new URL("../src/app/(erp)/pos/page.jsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../src/client/features/customers/QuickCreateCustomerModal.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../src/client/features/customers/quickCustomerState.js",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(terminal, /QuickCreateCustomerModal/);
  assert.match(terminal, /title="Quick Create Customer"/);
  assert.match(terminal, /onCreated=\{\(customer\) => \{/);
  assert.match(terminal, /setCustomerId\(customer\._id\)/);
  assert.match(terminal, /isPosMode/);
  assert.match(terminal, /Open Cash Register/);
  assert.ok(
    terminal.indexOf('label="Warehouse"') < terminal.indexOf("Open Cash Register"),
    "register control stays alongside the warehouse control",
  );

  assert.match(modal, /title=\{initialData \? "Edit Customer" : "Quick Create Customer"\}/);
  assert.match(modal, /label="Display Name"/);
  assert.match(modal, /label="Phone"/);
  assert.match(modal, /if \(!form\.displayName\) return toast\.error\("Customer name required"\)/);
  assert.doesNotMatch(modal, /Phone or email required/);
  assert.match(modal, /loading=\{isPending\}/);
  assert.match(modal, /onCreated\?\.\(result\.data\)/);
  assert.match(modal, /onClose\(\)/);
  assert.match(modal, /\n\s*Cancel\n\s*<\/Button>/);
  assert.match(customerState, /paymentTermsType: "cod"/);
});

test("POS sessions retain source-backed summaries, filters, and table presentation", async () => {
  const [sessions, hooks] = await Promise.all([
    readFile(new URL("../src/app/(erp)/pos-sessions/page.jsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../src/client/features/posSessions/usePosSessions.js",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  for (const label of [
    "Active Registers",
    "Total Cash Sales",
    "Total Cash Expenses",
    "Total Discrepancies",
  ]) {
    assert.match(sessions, new RegExp(label));
  }
  assert.match(sessions, /session\.status === "open"/);
  assert.match(sessions, /actualClosingBalance/);
  assert.match(sessions, /expectedBalance\(session\)/);
  assert.match(sessions, /label="Cashier"/);
  assert.match(sessions, /label="Start Date"/);
  assert.match(sessions, /label="End Date"/);
  assert.match(sessions, /userId: filters\.userId \|\| undefined/);
  assert.match(sessions, /overflow-x-auto/);
  assert.match(sessions, /rounded-full bg-indigo-50/);
  assert.match(sessions, /Open Register/);
  assert.match(sessions, /Balanced/);
  assert.match(sessions, /onClick=\{\(\) => refetch\(\)\}/);
  assert.match(sessions, /Link href="\/pos"/);
  assert.match(hooks, /posSessionsApi\.list\(filters\)/);
});

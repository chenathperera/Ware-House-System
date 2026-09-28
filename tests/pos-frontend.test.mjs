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

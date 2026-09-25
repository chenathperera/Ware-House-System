import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Credit Notes client and pages preserve the standalone source contract", async () => {
  const api = await read("../src/client/features/creditNotes/creditNotesApi.js");
  const hooks = await read("../src/client/features/creditNotes/useCreditNotes.js");
  const register = await read("../src/app/(erp)/credit-notes/page.jsx");
  const detail = await read("../src/app/(erp)/credit-notes/[id]/page.jsx");
  for (const endpoint of ["/credit-notes", "/credit-notes/${id}", "/credit-notes/${id}/apply"]) assert.ok(api.includes(endpoint));
  for (const key of ["creditNotes", "creditNote", "invoices", "invoice", "customers"]) assert.ok(hooks.includes(key));
  for (const label of ["Credit Notes", "No credit notes", "Remaining"]) assert.ok(register.includes(label));
  for (const label of ["Apply to Invoice", "Applications", "Select open invoice...", "Credit remaining:"]) assert.ok(detail.includes(label));
  assert.doesNotMatch(register + detail, /New Credit Note|Create Credit Note/);
});

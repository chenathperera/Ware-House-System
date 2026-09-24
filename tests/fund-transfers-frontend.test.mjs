import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Fund Transfers client API and hooks preserve source endpoints, keys, invalidation, and feedback", async () => {
  const api = await read(
    "../src/client/features/fundTransfers/fundTransfersApi.js",
  );
  const hooks = await read(
    "../src/client/features/fundTransfers/useFundTransfers.js",
  );

  for (const endpoint of [
    'api.get("/fund-transfers")',
    'api.post("/fund-transfers", data)',
    "api.put(`/fund-transfers/${id}`, data)",
    "api.delete(`/fund-transfers/${id}`)",
  ]) {
    assert.ok(api.includes(endpoint));
  }

  assert.match(hooks, /queryKey: \["fund-transfers"\]/);
  assert.match(hooks, /Transfer completed/);
  assert.match(hooks, /Transfer reversed/);
  assert.match(hooks, /Transfer updated/);
  const bankAccountInvalidations = hooks.match(
    /queryClient\.invalidateQueries\(\{ queryKey: \["bank-accounts"\] \}\)/g,
  );
  assert.equal(bankAccountInvalidations?.length, 1);
});

test("Fund Transfers register preserves source form, table, confirmation, and edit mismatch", async () => {
  const page = await read("../src/app/(erp)/fund-transfers/page.jsx");

  for (const value of [
    "Fund Transfers",
    "Transfer money between your bank accounts",
    "New Transfer",
    "Loading transfers...",
    "From Account",
    "To Account",
    "Amount to Transfer",
    "Reference",
    "Execute Transfer",
    "Reverse this transfer?",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /Source and destination accounts must be different/);
  assert.match(page, /amount: \+formData\.amount/);
  assert.match(page, /useBankAccounts/);
  assert.match(page, /useUpdateFundTransfer/);
});

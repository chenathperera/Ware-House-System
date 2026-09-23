import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Bank Accounts data layer preserves source endpoints, cache behavior, and toasts", async () => {
  const api = await read("../src/client/features/bankAccounts/bankAccountsApi.js");
  const hooks = await read("../src/client/features/bankAccounts/useBankAccounts.js");

  for (const endpoint of ["/bank-accounts", "api.put", "api.delete"]) {
    assert.ok(api.includes(endpoint));
  }
  assert.match(hooks, /queryKey: \["bank-accounts", filters\]/);
  for (const message of ["Bank account added", "Bank account updated", "Bank account deleted"]) {
    assert.ok(hooks.includes(message));
  }
});

test("Bank Accounts page preserves source list, modal, display, and browser-confirm workflows", async () => {
  const page = await read("../src/app/(erp)/bank-accounts/page.jsx");

  for (const value of [
    "Bank Accounts",
    "Manage Received, Payment, and Saving bank accounts",
    "No bank accounts added",
    "Loading accounts...",
    "Add Account",
    "Account Category",
    "Current Balance (LKR)",
    "Active",
    "Inactive",
    "Received Bank Account",
    "Payment Bank Account",
    "Saving Bank Account",
  ]) {
    assert.ok(page.includes(value));
  }
  assert.match(page, /window\.confirm\(`Delete \$\{account\.accountName\}\?`\)/);
  assert.match(page, /useCreateBankAccount/);
  assert.match(page, /useUpdateBankAccount/);
  assert.match(page, /useDeleteBankAccount/);
});

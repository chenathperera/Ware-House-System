import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Expenses client API and hooks preserve source endpoints, cache refreshes, and feedback", async () => {
  const api = await read("../src/client/features/expenses/expensesApi.js");
  const hooks = await read("../src/client/features/expenses/useExpenses.js");

  for (const endpoint of ["/expenses", "/expenses/categories", "api.post", "api.delete"]) {
    assert.ok(api.includes(endpoint));
  }

  assert.match(hooks, /queryKey: \["expenses", filters\]/);
  assert.match(hooks, /queryKey: \["expense-categories"\]/);
  assert.match(hooks, /Expense recorded successfully/);
  assert.match(hooks, /Expense deleted/);
  const bankAccountInvalidations = hooks.match(
    /queryClient\.invalidateQueries\(\{ queryKey: \["bank-accounts"\] \}\)/g,
  );
  assert.equal(bankAccountInvalidations?.length, 2);
  assert.match(hooks, /"pos-sessions", "active"/);
});

test("Expenses register preserves source filters, summary, table, loading, empty, and delete workflows", async () => {
  const page = await read("../src/app/(erp)/expenses/page.jsx");

  for (const value of [
    "Expenses",
    "Track operating expenses and cash drawer payouts",
    "Record Expense",
    "Showing Expenses",
    "Total Records",
    "Total Amount (shown)",
    "From Date",
    "To Date",
    "All Categories",
    "This Month",
    "Loading expenses...",
    "No expenses found",
    "Delete Expense",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /updateFilter\("category", expense\.category\)/);
  assert.match(page, /setDeletingExpense\(expense\)/);
  assert.match(page, /useDeleteExpense/);
});

test("Expense form preserves category autocomplete, source payment choices, validation, and creation", async () => {
  const form = await read("../src/client/features/expenses/ExpenseFormModal.jsx");

  for (const value of [
    "Meals & Entertainment",
    "Fuel & Travel",
    "General / Other",
    "Type or select a category...",
    "Please enter a category",
    "Cash (Deducts from Register)",
    "Bank Transfer",
    "Description / Notes",
  ]) {
    assert.ok(form.includes(value));
  }

  assert.match(form, /useExpenseCategories/);
  assert.match(form, /useCreateExpense/);
  assert.match(form, /category\.toLowerCase\(\)\.includes/);
  assert.match(form, /paymentMethod: "cash"/);
});

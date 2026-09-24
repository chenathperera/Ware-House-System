"use client";

import { useState } from "react";
import { Plus, Receipt, Trash2, X } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Table from "../../../components/ui/Table.jsx";
import ExpenseFormModal from "../../../client/features/expenses/ExpenseFormModal.jsx";
import {
  useDeleteExpense,
  useExpenseCategories,
  useExpenses,
} from "../../../client/features/expenses/useExpenses.js";

const initialFilters = {
  startDate: "",
  endDate: "",
  category: "",
  page: 1,
  limit: 50,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value);

function currentMonthFilters() {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  return { startDate, endDate };
}

export default function ExpensesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const { data: expensesData, isLoading } = useExpenses({
    ...filters,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    category: filters.category || undefined,
  });
  const { data: categoriesData } = useExpenseCategories();
  const deleteExpense = useDeleteExpense();
  const expenses = expensesData?.data || [];
  const total = expensesData?.total || 0;
  const allCategories = categoriesData?.data || [];
  const totalAmount = expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0,
  );
  const hasFilters = filters.startDate || filters.endDate || filters.category;

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const applyCurrentMonth = () => {
    setFilters((current) => ({
      ...current,
      ...currentMonthFilters(),
    }));
  };

  const confirmDelete = () => {
    deleteExpense.mutate(deletingExpense._id, {
      onSuccess: () => setDeletingExpense(null),
    });
  };

  const columns = [
    {
      key: "expenseNumber",
      label: "Expense #",
      render: (expense) => (
        <span className="font-mono text-xs">{expense.expenseNumber}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (expense) =>
        new Date(expense.date).toLocaleDateString("en-LK", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }),
    },
    {
      key: "category",
      label: "Category",
      render: (expense) => (
        <button
          type="button"
          className="inline-flex cursor-pointer items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          onClick={() => updateFilter("category", expense.category)}
          title="Filter by this category"
        >
          {expense.category}
        </button>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (expense) => (
        <span className="font-bold text-red-600">
          {formatCurrency(expense.amount)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment",
      render: (expense) => (
        <Badge className="text-[10px] uppercase">
          {expense.paymentMethod.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (expense) => (
        <span className="text-sm text-gray-500">
          {expense.description || expense.reference || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "80px",
      render: (expense) => (
        <button
          onClick={() => setDeletingExpense(expense)}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track operating expenses and cash drawer payouts"
        actions={
          <Button variant="primary" onClick={() => setIsFormOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Record Expense
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Showing Expenses" value={expenses.length} />
        <SummaryCard label="Total Records" value={total} />
        <SummaryCard
          label="Total Amount (shown)"
          value={formatCurrency(totalAmount)}
          className="border border-red-100 bg-red-50 text-red-700"
          labelClassName="text-red-600"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-gray-200 p-4">
          <DateFilter
            label="From Date"
            value={filters.startDate}
            onChange={(event) => updateFilter("startDate", event.target.value)}
          />
          <DateFilter
            label="To Date"
            value={filters.endDate}
            onChange={(event) => updateFilter("endDate", event.target.value)}
          />
          <div className="flex min-w-[180px] flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={filters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="">All Categories</option>
              {allCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-auto flex h-[38px] items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
            >
              <X size={14} />
              Clear Filters
            </Button>
          )}
          <div className="ml-auto mt-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={applyCurrentMonth}
              className="h-[38px] text-xs"
            >
              This Month
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses found"
            description={
              hasFilters
                ? "Try adjusting your filters"
                : "Record your first operating expense or cash payout."
            }
            action={
              !hasFilters && (
                <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                  <Plus size={16} className="mr-1.5" />
                  Record Expense
                </Button>
              )
            }
          />
        ) : (
          <Table columns={columns} data={expenses} />
        )}
      </Card>

      <ExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
      <ConfirmDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={confirmDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? If it was a cash expense, it will be refunded to the active cash register."
        confirmText="Delete"
        variant="danger"
        loading={deleteExpense.isPending}
      />
    </div>
  );
}

function DateFilter({ label, onChange, value }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type="date"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function SummaryCard({ className = "", label, labelClassName = "", value }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${className}`}>
      <p className={`text-xs font-medium text-gray-500 ${labelClassName}`}>
        {label}
      </p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

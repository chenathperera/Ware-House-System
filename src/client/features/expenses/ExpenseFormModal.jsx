"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useCreateExpense, useExpenseCategories } from "./useExpenses.js";

const DEFAULT_CATEGORIES = [
  "Meals & Entertainment",
  "Fuel & Travel",
  "Office Supplies",
  "Repairs & Maintenance",
  "Salary",
  "Utilities",
  "Rent",
  "Marketing",
  "General / Other",
];

const initialForm = () => ({
  date: new Date().toISOString().split("T")[0],
  amount: "",
  paymentMethod: "cash",
  description: "",
});

export default function ExpenseFormModal({ isOpen, onClose }) {
  const categoryRef = useRef(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: categoriesData } = useExpenseCategories();
  const createExpense = useCreateExpense();
  const dbCategories = categoriesData?.data || [];
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...dbCategories])];
  const filteredSuggestions = categoryInput
    ? allCategories.filter((category) =>
      category.toLowerCase().includes(categoryInput.toLowerCase()),
    )
    : allCategories;

  useEffect(() => {
    if (!isOpen) {
      setCategoryInput("");
      setShowSuggestions(false);
      return;
    }

    setCategoryInput("");
  }, [isOpen]);

  useEffect(() => {
    const handleMouseDown = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const closeModal = () => {
    setFormData(initialForm());
    setCategoryInput("");
    setShowSuggestions(false);
    onClose();
  };

  const submitExpense = (event) => {
    event.preventDefault();

    if (!categoryInput.trim()) {
      toast.error("Please enter a category");
      return;
    }

    createExpense.mutate(
      {
        ...formData,
        category: categoryInput.trim(),
      },
      { onSuccess: closeModal },
    );
  };

  const isNewCategory = categoryInput && !allCategories.some(
    (category) => category.toLowerCase() === categoryInput.toLowerCase(),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Expense" size="md">
      <form onSubmit={submitExpense}>
        <div className="space-y-4 p-4">
          <Input
            label="Date"
            type="date"
            required
            value={formData.date}
            onChange={(event) => updateField("date", event.target.value)}
          />

          <div ref={categoryRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Type or select a category..."
              value={categoryInput}
              onChange={(event) => {
                setCategoryInput(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {filteredSuggestions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="w-full border-b px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors last:border-0 hover:bg-primary-50"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setCategoryInput(category);
                      setShowSuggestions(false);
                    }}
                  >
                    {category}
                  </button>
                ))}
                {isNewCategory && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-green-700 transition-colors hover:bg-green-50"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="text-green-500">+</span>
                    Add &quot;{categoryInput}&quot; as new category
                  </button>
                )}
              </div>
            )}
            {!categoryInput && (
              <p className="mt-1 text-xs text-gray-400">
                Type a category or pick from suggestions
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (LKR)"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(event) => updateField("amount", event.target.value)}
            />
            <Select
              label="Payment Method"
              required
              options={[
                { value: "cash", label: "Cash (Deducts from Register)" },
                { value: "card", label: "Card" },
                { value: "bank_transfer", label: "Bank Transfer" },
              ]}
              value={formData.paymentMethod}
              onChange={(event) =>
                updateField("paymentMethod", event.target.value)
              }
            />
          </div>

          <Textarea
            label="Description / Notes"
            rows={3}
            value={formData.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={createExpense.isPending}
          >
            Record Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}

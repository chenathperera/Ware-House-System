"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import { useCategories, useCreateProduct, useUoms } from "./useProducts.js";
export function quickProductDefaults(defaultProductType = "finished_good") {
  return {
    name: "",
    productType: defaultProductType,
    categoryId: "",
    unitOfMeasure: "pcs",
    basePrice: 0,
    purchasePrice: 0,
    canBeSold: defaultProductType !== "raw_material",
    canBePurchased: true,
  };
}
export function toQuickProductPayload(form) {
  return {
    name: form.name,
    productType: form.productType,
    categoryId: form.categoryId || undefined,
    unitOfMeasure: form.unitOfMeasure,
    basePrice: +form.basePrice || 0,
    costs: {
      lastPurchaseCost: +form.purchasePrice || 0,
      averageCost: +form.purchasePrice || 0,
    },
    canBeSold: form.canBeSold,
    canBePurchased: form.canBePurchased,
    canBeManufactured: false,
    tax: { taxable: true, taxRate: 18 },
    status: "active",
  };
}
export default function QuickCreateProductModal({
  isOpen,
  onClose,
  onCreated,
  defaultProductType = "finished_good",
}) {
  const [form, setForm] = useState(() =>
    quickProductDefaults(defaultProductType),
  );
  const createMutation = useCreateProduct();
  const { data: categoriesData } = useCategories({ isActive: "true" });
  const { data: uomsData } = useUoms();
  const change = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));
  async function submit() {
    if (!form.name) return toast.error("Product name required");
    try {
      const result = await createMutation.mutateAsync(
        toQuickProductPayload(form),
      );
      setForm(quickProductDefaults(defaultProductType));
      toast.success(
        "Product created — complete pricing/stock from Products page",
      );
      onCreated?.(result.data);
      onClose();
    } catch {}
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Create Product"
      size="md"
    >
      <div className="space-y-4 p-6">
        <p className="rounded bg-blue-50 p-2 text-xs text-blue-700">
          Capture essentials now. You can add full pricing tiers, stock levels,
          BOM, and images from the Products page.
        </p>
        <Input
          label="Product Name"
          required
          placeholder="e.g., Sugar 1kg"
          value={form.name}
          onChange={change("name")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            options={[
              "finished_good",
              "raw_material",
              "packaging",
              "consumable",
              "service",
            ].map((value) => ({ value, label: value }))}
            value={form.productType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                productType: event.target.value,
                canBeSold: event.target.value !== "raw_material",
              }))
            }
          />
          <Select
            label="Unit of Measure"
            required
            options={(uomsData?.data || []).map((item) => ({
              value: item.code,
              label: `${item.name} (${item.code})`,
            }))}
            value={form.unitOfMeasure}
            onChange={change("unitOfMeasure")}
          />
        </div>
        <Select
          label="Category"
          placeholder="Uncategorized"
          options={(categoriesData?.data || []).map((item) => ({
            value: item._id,
            label: item.name,
          }))}
          value={form.categoryId}
          onChange={change("categoryId")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Selling Price (LKR)"
            type="number"
            step="0.01"
            min="0"
            value={form.basePrice}
            onChange={change("basePrice")}
          />
          <Input
            label="Purchase Cost (LKR)"
            type="number"
            step="0.01"
            min="0"
            value={form.purchasePrice}
            onChange={change("purchasePrice")}
          />
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.canBeSold}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  canBeSold: event.target.checked,
                }))
              }
            />
            Can be sold
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.canBePurchased}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  canBePurchased: event.target.checked,
                }))
              }
            />
            Can be purchased
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={submit}
          loading={createMutation.isPending}
        >
          Create Product
        </Button>
      </div>
    </Modal>
  );
}

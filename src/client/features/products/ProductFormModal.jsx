"use client";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { productFormSchema } from "./productSchemas.js";
import {
  hydrateProductForm,
  productFormDefaults,
  productTabs,
  roundedPrice,
  roundedProfit,
  toProductPayload,
} from "./productFormState.js";
import {
  useBrands,
  useCategories,
  useCreateProduct,
  useProducts,
  useUoms,
  useUpdateProduct,
} from "./useProducts.js";

const types = ["trading", "manufactured", "service", "bundle"].map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));
const productTypes = [
  "finished_good",
  "raw_material",
  "semi_finished",
  "packaging",
  "consumable",
  "service",
].map((value) => ({ value, label: value.replaceAll("_", " ") }));

export default function ProductFormModal({ isOpen, onClose, product = null }) {
  const [activeTab, setActiveTab] = useState("basic");
  const isEdit = !!product;
  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const { data: uomsData } = useUoms();
  const { data: allProductsData } = useProducts({
    limit: 1000,
    status: "active",
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: productFormDefaults(),
  });
  const tiers = useFieldArray({ control, name: "tierPricing" });
  const variations = useFieldArray({ control, name: "variations" });
  const combos = useFieldArray({ control, name: "comboItems" });
  const nature = watch("productNature");
  const buyingPrice = watch("buyingPrice") || 0;
  const tabIndex = productTabs.findIndex((tab) => tab.id === activeTab);
  const isLoading = createProduct.isPending || updateProduct.isPending;
  useEffect(() => {
    if (isOpen) reset(hydrateProductForm(product));
    setActiveTab("basic");
  }, [isOpen, product, reset]);
  async function submit(data) {
    try {
      const payload = toProductPayload(data, product);
      if (isEdit)
        await updateProduct.mutateAsync({ id: product._id, data: payload });
      else await createProduct.mutateAsync(payload);
      onClose();
    } catch {}
  }
  const options = {
    categories: (categoriesData?.data || []).map((item) => ({
      value: item._id,
      label: `${item.name} (${item.code})`,
    })),
    brands: (brandsData?.data || []).map((item) => ({
      value: item._id,
      label: item.name,
    })),
    uoms: (uomsData?.data || []).map((item) => ({
      value: item.symbol,
      label: `${item.name} (${item.symbol})`,
    })),
    products: (allProductsData?.data || []).map((item) => ({
      value: item._id,
      label: `${item.name} (${item.productCode})`,
    })),
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit ? `Edit Product — ${product?.productCode}` : "Create New Product"
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="border-b border-gray-200">
          <div className="flex gap-1 overflow-x-auto px-6">
            {productTabs.map((tab) =>
              (tab.id === "variations" && nature !== "variable") ||
              (tab.id === "combo" && nature !== "combo") ? null : (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500"}`}
                >
                  {tab.label}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="p-6">
          {activeTab === "basic" && (
            <Basic register={register} errors={errors} options={options} />
          )}
          {activeTab === "variations" && (
            <Variations
              fields={variations.fields}
              register={register}
              errors={errors}
              append={variations.append}
              remove={variations.remove}
              basePrice={watch("basePrice")}
              buyingPrice={buyingPrice}
            />
          )}
          {activeTab === "combo" && (
            <Combos
              fields={combos.fields}
              register={register}
              errors={errors}
              append={combos.append}
              remove={combos.remove}
              options={options.products}
            />
          )}
          {activeTab === "pricing" && (
            <Pricing
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              product={product}
            />
          )}
          {activeTab === "tiers" && (
            <Tiers
              fields={tiers.fields}
              register={register}
              append={tiers.append}
              remove={tiers.remove}
              watch={watch}
              buyingPrice={buyingPrice}
            />
          )}
          {activeTab === "stock" && (
            <Stock register={register} errors={errors} />
          )}
          {activeTab === "sales" && (
            <Sales register={register} errors={errors} />
          )}
        </div>
        <Footer
          activeTab={activeTab}
          tabIndex={tabIndex}
          setActiveTab={setActiveTab}
          onClose={onClose}
          isLoading={isLoading}
          isEdit={isEdit}
        />
      </form>
    </Modal>
  );
}
function Basic({ register, errors, options }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Product Name"
          required
          error={errors.name?.message}
          {...register("name")}
        />
        <Select
          label="Product Nature"
          required
          options={[
            { value: "single", label: "Single Product" },
            { value: "variable", label: "Variable Product" },
            { value: "combo", label: "Combo Product (Bundle)" },
          ]}
          {...register("productNature")}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Short Name" {...register("shortName")} />
        <Input label="Barcode" {...register("barcode")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="SKU" {...register("sku")} />
        <Select label="Type" required options={types} {...register("type")} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Category"
          required
          error={errors.categoryId?.message}
          options={options.categories}
          {...register("categoryId")}
        />
        <Select
          label="Brand"
          options={options.brands}
          {...register("brandId")}
        />
        <Select
          label="Product Type"
          required
          options={productTypes}
          {...register("productType")}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Unit of Measure"
          required
          error={errors.unitOfMeasure?.message}
          options={options.uoms}
          {...register("unitOfMeasure")}
        />
        <Select
          label="Status"
          required
          options={["active", "inactive", "draft", "discontinued"].map(
            (value) => ({ value, label: value }),
          )}
          {...register("status")}
        />
      </div>
      <div className="grid grid-cols-3 gap-4 border-t pt-2">
        <Check label="Can be sold" register={register("canBeSold")} />
        <Check label="Can be purchased" register={register("canBePurchased")} />
        <Check
          label="Can be manufactured"
          register={register("canBeManufactured")}
        />
      </div>
      <Textarea label="Description" rows={3} {...register("description")} />
      <Textarea label="Internal Notes" rows={2} {...register("notes")} />
    </div>
  );
}
function Check({ label, register }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" {...register} />
      {label}
    </label>
  );
}
function Variations({
  fields,
  register,
  errors,
  append,
  remove,
  basePrice,
  buyingPrice,
}) {
  return (
    <ArraySection
      title="Product Variations"
      addText="+ Add Variation"
      onAdd={() =>
        append({
          name: "",
          sku: "",
          price: basePrice || 0,
          purchasePrice: buyingPrice || 0,
          stock: 0,
        })
      }
      empty="No variations added yet."
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="relative space-y-3 rounded-lg border p-4"
        >
          <button
            type="button"
            onClick={() => remove(index)}
            className="absolute right-2 top-2 text-red-500"
          >
            Remove
          </button>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Variation Name (e.g. Red, XL)"
              required
              error={errors.variations?.[index]?.name?.message}
              {...register(`variations.${index}.name`)}
            />
            <Input label="SKU" {...register(`variations.${index}.sku`)} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Input
              label="Barcode"
              {...register(`variations.${index}.barcode`)}
            />
            <Input
              label="Purchase Price"
              type="number"
              step="0.01"
              {...register(`variations.${index}.purchasePrice`)}
            />
            <Input
              label="Sell Price"
              type="number"
              step="0.01"
              {...register(`variations.${index}.price`)}
            />
            <Input
              label="Initial Stock"
              type="number"
              {...register(`variations.${index}.stock`)}
            />
          </div>
        </div>
      ))}
    </ArraySection>
  );
}
function Combos({ fields, register, errors, append, remove, options }) {
  return (
    <ArraySection
      title="Combo Items (Bundle Components)"
      addText="+ Add Item"
      onAdd={() => append({ productId: "", quantity: 1, priceContribution: 0 })}
      empty="No items added to this combo yet."
    >
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-end gap-4 rounded-lg border p-3"
        >
          <div className="flex-1">
            <Select
              label="Select Product"
              required
              error={errors.comboItems?.[index]?.productId?.message}
              options={options}
              {...register(`comboItems.${index}.productId`)}
            />
          </div>
          <div className="w-24">
            <Input
              label="Qty"
              type="number"
              required
              {...register(`comboItems.${index}.quantity`)}
            />
          </div>
          <div className="w-32">
            <Input
              label="Price Contr."
              type="number"
              step="0.01"
              {...register(`comboItems.${index}.priceContribution`)}
            />
          </div>
          <Button type="button" variant="outline" onClick={() => remove(index)}>
            Remove
          </Button>
        </div>
      ))}
    </ArraySection>
  );
}
function ArraySection({ title, addText, onAdd, empty, children }) {
  const exists = Array.isArray(children) && children.length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          {addText}
        </Button>
      </div>
      {exists ? (
        children
      ) : (
        <div className="rounded-lg border-2 border-dashed bg-gray-50 py-8 text-center text-sm text-gray-500">
          {empty}
        </div>
      )}
    </div>
  );
}
function Pricing({ register, errors, setValue, watch, product }) {
  const updateSell = (event) =>
    setValue(
      "basePrice",
      roundedPrice(
        parseFloat(event.target.value) || 0,
        watch("profitPercentage") || 0,
      ),
    );
  const updateProfit = (event) =>
    setValue(
      "basePrice",
      roundedPrice(
        watch("buyingPrice") || 0,
        parseFloat(event.target.value) || 0,
      ),
    );
  const updateFromSell = (event) => {
    const profit = roundedProfit(
      watch("buyingPrice") || 0,
      parseFloat(event.target.value) || 0,
    );
    if (profit !== undefined) setValue("profitPercentage", profit);
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Buying Price (LKR)"
          type="number"
          step="0.01"
          error={errors.buyingPrice?.message}
          {...register("buyingPrice", { onChange: updateSell })}
        />
        <Input
          label="Profit (%)"
          type="number"
          step="0.01"
          {...register("profitPercentage", { onChange: updateProfit })}
        />
        <Input
          label="Selling Price (LKR)"
          type="number"
          step="0.01"
          required
          error={errors.basePrice?.message}
          {...register("basePrice", { onChange: updateFromSell })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="MRP (LKR)"
          type="number"
          step="0.01"
          {...register("mrp")}
        />
        <div>
          <Input
            label="Call Price (LKR)"
            type="number"
            step="0.01"
            {...register("callPrice")}
          />
          {product?.callPriceUpdatedAt && (
            <span className="mt-1 text-[11px] text-gray-500">
              Last Updated:{" "}
              {new Date(product.callPriceUpdatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
function Tiers({ fields, register, append, remove, watch, buyingPrice }) {
  return (
    <ArraySection
      title="Wholesale Price Tiers"
      addText="+ Add Tier"
      onAdd={() =>
        append({
          tierName: watch("name") || "",
          minQuantity: 1,
          maxQuantity: null,
          price: 0,
        })
      }
      empty="No price tiers defined yet."
    >
      {fields.map((field, index) => {
        const price = watch(`tierPricing.${index}.price`) || 0;
        const profit =
          buyingPrice > 0
            ? (((price - buyingPrice) / buyingPrice) * 100).toFixed(2)
            : 0;
        return (
          <div key={field.id} className="grid grid-cols-6 gap-2">
            <Input
              label="Tier Name"
              {...register(`tierPricing.${index}.tierName`)}
            />
            <Input
              label="Min Qty"
              type="number"
              {...register(`tierPricing.${index}.minQuantity`)}
            />
            <Input
              label="Max Qty"
              type="number"
              {...register(`tierPricing.${index}.maxQuantity`)}
            />
            <Input
              label="Price (LKR)"
              type="number"
              step="0.01"
              {...register(`tierPricing.${index}.price`)}
            />
            <span
              className={
                profit > 0
                  ? "self-end pb-2 text-green-600"
                  : "self-end pb-2 text-red-600"
              }
            >
              {profit}%
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          </div>
        );
      })}
    </ArraySection>
  );
}
function Stock({ register, errors }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">Stock Levels</h4>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Minimum Level"
          type="number"
          error={errors.minimumLevel?.message}
          {...register("minimumLevel")}
        />
        <Input
          label="Reorder Level"
          type="number"
          error={errors.reorderLevel?.message}
          {...register("reorderLevel")}
        />
        <Input
          label="Maximum Level"
          type="number"
          error={errors.maximumLevel?.message}
          {...register("maximumLevel")}
        />
      </div>
      <h4 className="pt-4 text-sm font-semibold text-gray-700">Packaging</h4>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Units per Carton"
          type="number"
          {...register("unitsPerCarton")}
        />
        <Input
          label="Cartons per Pallet"
          type="number"
          {...register("cartonsPerPallet")}
        />
      </div>
    </div>
  );
}
function Sales({ register, errors }) {
  return (
    <div className="space-y-4">
      <Check
        label="Sellable (can be added to sales orders)"
        register={register("sellable")}
      />
      <Check
        label="Allow backorder when out of stock"
        register={register("allowBackorder")}
      />
      <Input
        label="Minimum Order Quantity"
        type="number"
        error={errors.minimumOrderQuantity?.message}
        {...register("minimumOrderQuantity")}
      />
    </div>
  );
}
function Footer({
  activeTab,
  tabIndex,
  setActiveTab,
  onClose,
  isLoading,
  isEdit,
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
      <div>
        {activeTab !== "basic" && (
          <Button
            variant="outline"
            type="button"
            onClick={() => setActiveTab(productTabs[tabIndex - 1].id)}
          >
            Previous
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        {activeTab !== "sales" ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => setActiveTab(productTabs[tabIndex + 1].id)}
          >
            Next
          </Button>
        ) : (
          <Button type="submit" variant="primary" loading={isLoading}>
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
        )}
      </div>
    </div>
  );
}

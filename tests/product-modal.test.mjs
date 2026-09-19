import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  hydrateProductForm,
  productFormDefaults,
  productTabs,
  roundedPrice,
  roundedProfit,
  toProductPayload,
} from "../src/client/features/products/productFormState.js";
test("product form preserves original tabs and pricing rounding", () => {
  assert.deepEqual(
    productTabs.map((tab) => tab.id),
    ["basic", "variations", "combo", "pricing", "tiers", "stock", "sales"],
  );
  assert.equal(roundedPrice(100, 18.555), 118.56);
  assert.equal(roundedProfit(100, 118.555), 18.56);
});
test("product payload preserves original hidden non-taxable submit and conditional arrays", () => {
  const data = {
    ...productFormDefaults(),
    name: "Product",
    categoryId: "category",
    unitOfMeasure: "pcs",
    productNature: "variable",
    variations: [{ name: "Red", price: 10 }],
    comboItems: [{ productId: "other", quantity: 1 }],
    stockLevels: {},
  };
  const payload = toProductPayload(data, { costs: { averageCost: 7 } });
  assert.deepEqual(payload.tax, { taxable: false, taxRate: 0 });
  assert.equal(payload.variations.length, 1);
  assert.deepEqual(payload.comboItems, []);
  assert.equal(payload.costs.averageCost, 7);
});
test("product edit hydration maps nested fields and populated combo ids", () => {
  const form = hydrateProductForm({
    name: "P",
    categoryId: { _id: "c" },
    costs: { standardCost: 20 },
    basePrice: 30,
    comboItems: [
      { productId: { _id: "p" }, quantity: 2, priceContribution: 5 },
    ],
  });
  assert.equal(form.categoryId, "c");
  assert.equal(form.profitPercentage, "50.00");
  assert.equal(form.comboItems[0].productId, "p");
});
test("modal and quick create retain source-specific sections and payload behavior", async () => {
  const modal = await readFile(
    new URL(
      "../src/client/features/products/ProductFormModal.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const quick = await readFile(
    new URL(
      "../src/client/features/products/QuickCreateProductModal.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(modal, /function Pricing/);
  assert.match(modal, /function Stock/);
  assert.match(modal, /function Combos/);
  assert.match(modal, /Wholesale Price Tiers/);
  assert.match(quick, /Product name required/);
  assert.match(quick, /canBeManufactured: false/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { updateProductSchema } from "../src/server/validators/productValidator.js";

test("original wholesale page submits its local tier values without coercion", () => {
  const browserTierPayload = {
    tierPricing: [
      {
        tierName: "Bulk",
        minQuantity: "1",
        maxQuantity: "",
        price: "100",
      },
    ],
  };

  assert.equal(updateProductSchema.safeParse(browserTierPayload).success, false);
  assert.equal(
    updateProductSchema.safeParse({
      tierPricing: [{ tierName: "Bulk", minQuantity: 1, maxQuantity: 10, price: 100 }],
    }).success,
    true,
  );
  assert.equal(
    updateProductSchema.safeParse({
      tierPricing: [{ tierName: "Bulk", minQuantity: 1, maxQuantity: null, price: 100 }],
    }).success,
    false,
  );
});

test("wholesale price management retains original tier editing and empty-state behavior", async () => {
  const page = await readFile(
    new URL("../src/app/(erp)/wholesale-prices/page.jsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /tierPricing: tiers/);
  assert.doesNotMatch(page, /tierPricing: tiers\.map/);
  assert.match(page, /product\.costs\?\.standardCost \|\| 0/);
  assert.match(page, /No additional wholesale tiers defined\./);
  assert.match(page, /Add New Price Tier/);
  assert.match(page, /setEditingId\(null\)/);
});

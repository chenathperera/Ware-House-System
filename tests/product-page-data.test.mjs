import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Products page preserves original filter defaults, table columns, and display rules", async () => {
  const page = await read("../src/app/(erp)/products/page.jsx");
  assert.match(page, /search: ""/);
  assert.match(page, /categoryId: ""/);
  assert.match(page, /status: ""/);
  assert.match(page, /limit: 10/);
  assert.match(page, /Purchase Price/);
  assert.match(page, /Call Price/);
  assert.match(page, /Profit \(%\)/);
  assert.match(page, /callPriceUpdatedAt/);
  assert.match(page, /minimumFractionDigits: 2/);
  assert.match(page, /can be restored by an admin/);
});

test("Products page retains original admin-manager action boundary and editable view action", async () => {
  const page = await read("../src/app/(erp)/products/page.jsx");
  assert.match(page, /\["admin", "manager"\]/);
  assert.match(page, /open\(row, true\)/);
  assert.match(page, /disabled=\{isView\}/);
  assert.match(page, /isFetching && !isLoading/);
});

test("Product API and hooks restore original detail, reference, query and mutation contracts", async () => {
  const api = await read("../src/client/features/products/productsApi.js");
  const hooks = await read("../src/client/features/products/useProducts.js");
  assert.match(api, /getById/);
  assert.match(api, /listCategories/);
  assert.match(api, /listBrands/);
  assert.match(api, /listUoms/);
  assert.match(hooks, /placeholderData/);
  assert.match(hooks, /queryKey: \["product", id\]/);
  assert.match(hooks, /enabled: !!id/);
  assert.match(hooks, /Failed to delete product/);
  assert.match(hooks, /isActive: true/);
  assert.match(hooks, /10 \* 60 \* 1000/);
});

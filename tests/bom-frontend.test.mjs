import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
test("BOM client keeps source endpoints, query keys, and mutation invalidation", async () => { const api = await read("../src/client/features/boms/bomsApi.js"); const hooks = await read("../src/client/features/boms/useBoms.js"); for (const path of ["/boms", "/boms/${id}", "/check-availability"]) assert.ok(api.includes(path)); for (const key of ["boms", "bom", "bomAvailability"]) assert.ok(hooks.includes(key)); assert.match(hooks, /invalidateQueries\(\{ queryKey: \["boms"\] \}\)/); });
test("BOM pages preserve register, create/edit, components, availability, archive, and navigation contracts", async () => { const register = await read("../src/app/(erp)/boms/page.jsx"); const form = await read("../src/app/(erp)/boms/new/page.jsx"); const detail = await read("../src/app/(erp)/boms/[id]/page.jsx"); for (const label of ["Bills of Materials (BOM)", "New BOM", "Search BOM or product..."]) assert.ok(register.includes(label)); for (const label of ["New Bill of Materials", "Edit BOM", "Finished Product", "Components / Raw Materials", "Cost Summary", "Save BOM"]) assert.ok(form.includes(label)); for (const label of ["Material Availability", "Archive BOM", "Create Production Order", "Costing"]) assert.ok(detail.includes(label)); assert.match(form, /create\.mutateAsync\(payload\)/); assert.match(form, /update\.mutateAsync\(\{ id, data: payload \}\)/); assert.match(form, /filter\(\(_, row\) => row !== index\)/); assert.match(detail, /\/production-orders\/new\?bomId=/); });
test("BOM component options follow the original product-type rule and retain component selections in the payload", async () => {
  const form = await read("../src/app/(erp)/boms/new/page.jsx");
  for (const productType of ["raw_material", "packaging", "semi_finished", "consumable"]) {
    assert.ok(form.includes(`"${productType}"`));
  }
  assert.match(form, /\["finished_good", "semi_finished"\]/);
  assert.match(form, /options=\{componentOptions\}/);
  assert.match(form, /value=\{item\.productId\}/);
  assert.match(form, /updateComponent\(index, "productId", event\.target\.value\)/);
  assert.match(form, /components: form\.components\.map\(\(item\) => \(\{/);
  assert.match(form, /value: item\._id/);
  assert.match(form, /productId: ""/);
});

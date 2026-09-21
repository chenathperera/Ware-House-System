import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
test("Damages frontend preserves original register, summary, form, and data contracts", async () => {
  const page = await read("../src/app/(erp)/damages/page.jsx");
  const api = await read("../src/client/features/damages/damagesApi.js");
  const hooks = await read("../src/client/features/damages/useDamages.js");
  for (const label of ["Damages & Scrap Register", "Total Damages Recorded", "Total Value Lost", "Top Source", "Record Damage", "Also decrement stock immediately", "No damages", "Required fields missing"]) assert.ok(page.includes(label));
  for (const path of ["/damages", "/damages/${id}", "/damages/${id}/write-off", "/damages/summary"]) assert.ok(api.includes(path));
  assert.match(hooks, /placeholderData/); assert.match(hooks, /Damage recorded/); assert.match(hooks, /Written off/);
});

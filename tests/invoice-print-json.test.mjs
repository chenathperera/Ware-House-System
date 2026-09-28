import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Bluetooth Print endpoint preserves the source-backed public invoice command path", async () => {
  const [route, service, helper] = await Promise.all([
    read("../src/app/api/invoices/[id]/print-json/route.js"),
    read("../src/server/services/invoiceApiService.js"),
    read("../src/client/utils/printHelpers.js"),
  ]);

  assert.match(route, /apiHandler\(getInvoicePrintJson\)/);
  assert.match(service, /export async function getInvoicePrintJson/);
  for (const value of ["Receipt No:", "Description", "Paid Amount", "Amount Due", "receiptFooterMessage"]) {
    assert.ok(service.includes(value), value);
  }
  assert.match(helper, /my\.bluetoothprint\.scheme:\/\//);
  assert.match(helper, /\/invoices\/\$\{invoiceId\}\/print-json/);
});

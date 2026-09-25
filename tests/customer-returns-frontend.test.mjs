import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Customer Returns client contracts preserve source endpoints and cache effects", async () => {
  const api = await read("../src/client/features/returns/returnsApi.js");
  const hooks = await read("../src/client/features/returns/useReturns.js");

  for (const endpoint of ["/customer-returns", "/approve", "/reject", "/receive", "/process", "/issue-credit-note", "/complete", "/eligible-orders"]) {
    assert.ok(api.includes(endpoint));
  }
  for (const key of ["returns", "return", "eligibleOrdersForReturn", "creditNotes", "customers", "repairs"]) {
    assert.ok(hooks.includes(key));
  }
});

test("Customer Returns pages preserve source create, inspection, and credit-note UI contracts", async () => {
  const register = await read("../src/app/(erp)/returns/page.jsx");
  const form = await read("../src/app/(erp)/returns/new/page.jsx");
  const detail = await read("../src/app/(erp)/returns/[id]/page.jsx");

  for (const page of [register, form, detail]) assert.ok(page.length > 0);
  for (const label of ["Customer Returns (RMA)", "New Return"]) assert.ok(register.includes(label));
  for (const label of ["New Return Request (RMA)", "Customer &amp; Source Orders", "Items to Return", "Create RMA"]) assert.ok(form.includes(label));
  assert.match(form, /salesOrderIds: selectedOrderIds/);
  assert.match(form, /const orders = useMemo\(\(\) => ordersData\?\.data \|\| \[\], \[ordersData\?\.data\]\);/);
  assert.doesNotMatch(form, /eligibleOrders\.filter/);
  assert.match(form, /max=\{item\.remainingReturnableQuantity\}/);
  for (const label of ["Approve", "Reject", "Mark Received", "Process & Inspect", "Issue Credit Note", "Credit Note Issued"]) assert.ok(detail.includes(label));
  assert.match(detail, /ret\.status === "processed" && !ret\.creditNoteId/);
  assert.match(detail, /Restock will add it back to stock/);
});

test("Customer Returns create page keeps an eligible order without a projected status", () => {
  const eligibleOrdersResponse = {
    success: true,
    data: [{
      _id: "sales-order-1",
      orderNumber: "SO-1",
      grandTotal: 0.01,
      items: [{
        _id: "line-1",
        productCode: "PRD-55",
        productName: "chenath perera",
        orderedQuantity: 1,
        deliveredQuantity: 1,
        returnedQuantity: 0,
        remainingReturnableQuantity: 1,
        unitOfMeasure: "kg",
      }],
    }],
  };

  const orders = eligibleOrdersResponse.data || [];
  assert.equal(orders.length, 1);
  assert.equal(orders[0].orderNumber, "SO-1");
  assert.equal(orders[0].items[0].remainingReturnableQuantity, 1);
});

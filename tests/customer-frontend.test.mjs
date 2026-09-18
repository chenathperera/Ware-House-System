import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { customerFormSchema } from "../src/client/features/customers/customerSchemas.js";
import {
  customerFormDefaults,
  hydrateCustomerForm,
  toCustomerPayload,
} from "../src/client/features/customers/customerFormState.js";
import {
  hydrateQuickCustomerForm,
  toQuickCustomerPayload,
} from "../src/client/features/customers/quickCustomerState.js";

test("original customer form defaults keep a nested billing and shipping address", () => {
  const defaults = customerFormDefaults();
  assert.equal(defaults.customerType, "company");
  assert.equal(defaults.paymentTermsType, "cod");
  assert.equal(defaults.billingAddress.country, "Sri Lanka");
  assert.equal(defaults.billingAddress.isDefault, true);
  assert.equal(defaults.shippingAddresses.length, 1);
  assert.equal(defaults.shippingAddresses[0].isDefault, true);
});

test("original edit hydration retains populated nested records and references", () => {
  const form = hydrateCustomerForm({
    customerType: "individual",
    businessType: "reseller",
    customerGroupId: { _id: "group-1" },
    assignedSalesRep: { _id: "rep-1" },
    paymentTerms: { type: "credit", creditDays: 14, creditLimit: 5000 },
    shippingAddresses: [{ line1: "42 Main Street", isDefault: true }],
    contacts: [{ name: "Accounts", role: "accounts" }],
  });
  assert.equal(form.customerGroupId, "group-1");
  assert.equal(form.assignedSalesRep, "rep-1");
  assert.equal(form.paymentTermsType, "credit");
  assert.equal(form.creditLimit, 5000);
  assert.equal(form.shippingAddresses[0].line1, "42 Main Street");
  assert.equal(form.contacts[0].name, "Accounts");
});

test("original full-form transform filters only empty shipping addresses and contacts", () => {
  const payload = toCustomerPayload({
    ...customerFormDefaults(),
    displayName: "ACME",
    primaryContact: { name: "Owner", email: "owner@example.com" },
    shippingAddresses: [
      { line1: "" },
      { line1: "Delivery road", city: "Kandy" },
    ],
    contacts: [{ name: "" }, { name: "Buyer", role: "purchasing" }],
    notes: "",
  });
  assert.deepEqual(payload.shippingAddresses, [
    { line1: "Delivery road", city: "Kandy" },
  ]);
  assert.deepEqual(payload.contacts, [{ name: "Buyer", role: "purchasing" }]);
  assert.equal(payload.notes, undefined);
  assert.equal(payload.paymentTerms.type, "cod");
});

test("original customer schema validates nested contact email and commercial limits", () => {
  const valid = customerFormSchema.safeParse({
    ...customerFormDefaults(),
    displayName: "ACME",
    primaryContact: { email: "valid@example.com" },
    contacts: [{ email: "invalid-email" }],
  });
  assert.equal(valid.success, false);
  const discount = customerFormSchema.safeParse({
    ...customerFormDefaults(),
    displayName: "ACME",
    defaultDiscountPercent: 101,
  });
  assert.equal(discount.success, false);
});

test("original quick-create preserves its cash payload and lightweight address shape", () => {
  const initial = hydrateQuickCustomerForm({
    displayName: "ACME",
    primaryContact: { phone: "0712345678" },
    billingAddress: { line1: "Main Street", city: "Colombo" },
  });
  const payload = toQuickCustomerPayload(initial);
  assert.equal(payload.paymentTerms.type, "cash");
  assert.equal(payload.primaryAddress.line1, "Main Street");
  assert.equal(payload.creditLimit, 0);
});

test("customers page uses dedicated original-equivalent feature components and actions", async () => {
  const page = await readFile(
    new URL("../src/app/(erp)/customers/page.jsx", import.meta.url),
    "utf8",
  );
  const modal = await readFile(
    new URL(
      "../src/client/features/customers/CustomerFormModal.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(page, /CustomerFormModal/);
  assert.match(page, /Place on Credit Hold/);
  assert.match(page, /Remove credit hold/);
  assert.match(modal, /Basic Info/);
  assert.match(modal, /Shipping Addresses/);
  assert.match(modal, /Current Credit Status/);
  assert.match(modal, /Additional Contacts/);
});

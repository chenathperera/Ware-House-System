import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { supplierFormSchema } from "../src/client/features/suppliers/supplierSchemas.js";
import {
  hydrateSupplierForm,
  supplierFormDefaults,
  toSupplierPayload,
} from "../src/client/features/suppliers/supplierFormState.js";

test("original supplier defaults and edit hydration retain commercial and banking values", () => {
  assert.deepEqual(supplierFormDefaults(), {
    type: "company",
    category: "raw_material",
    paymentTermsType: "credit",
    creditDays: 30,
    creditLimit: 0,
    status: "active",
    averageLeadTimeDays: 7,
  });
  const form = hydrateSupplierForm({
    type: "individual",
    paymentTerms: { type: "consignment", creditDays: 14, creditLimit: 5000 },
    bankDetails: { bankName: "Bank", accountNumber: "123" },
    billingAddress: { line1: "Main Road" },
  });
  assert.equal(form.paymentTermsType, "consignment");
  assert.equal(form.bankName, "Bank");
  assert.equal(form.billingAddress.line1, "Main Road");
});
test("original supplier payload preserves addresses, terms and bank detail shape", () => {
  const payload = toSupplierPayload({
    ...supplierFormDefaults(),
    displayName: "ABC",
    billingAddress: { line1: "Billing" },
    shippingAddress: { line1: "Shipping" },
    bankName: " Bank ",
    branchName: "Branch",
    accountNumber: "1",
    accountName: "ABC",
    swiftCode: "SWIFT",
    notes: "",
  });
  assert.deepEqual(payload.billingAddress, { line1: "Billing" });
  assert.equal(payload.bankDetails.bankName, " Bank ");
  assert.equal(payload.paymentTerms.type, "credit");
  assert.equal(payload.notes, undefined);
});
test("original supplier schema validates display name, contact email and numeric limits", () => {
  assert.equal(
    supplierFormSchema.safeParse({
      ...supplierFormDefaults(),
      displayName: "",
      primaryContact: {},
    }).success,
    false,
  );
  assert.equal(
    supplierFormSchema.safeParse({
      ...supplierFormDefaults(),
      displayName: "ABC",
      primaryContact: { email: "bad" },
    }).success,
    false,
  );
  assert.equal(
    supplierFormSchema.safeParse({
      ...supplierFormDefaults(),
      displayName: "ABC",
      creditLimit: -1,
    }).success,
    false,
  );
});
test("supplier page and modal retain only original tabs/actions", async () => {
  const page = await readFile(
    new URL("../src/app/(erp)/suppliers/page.jsx", import.meta.url),
    "utf8",
  );
  const modal = await readFile(
    new URL(
      "../src/client/features/suppliers/SupplierFormModal.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const quick = await readFile(
    new URL(
      "../src/client/features/suppliers/QuickCreateSupplierModal.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(page, /All Categories/);
  assert.match(page, /Delete Supplier/);
  assert.match(modal, /Basic Info/);
  assert.match(modal, /Addresses/);
  assert.match(modal, /Commercial/);
  assert.match(modal, /Banking/);
  assert.match(modal, /Average Lead Time/);
  assert.match(quick, /Supplier name required/);
});

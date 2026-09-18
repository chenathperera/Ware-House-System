export const emptyQuickCustomerForm = {
  displayName: "",
  legalName: "",
  customerGroupId: "",
  phone: "",
  email: "",
  addressLine1: "",
  city: "",
  paymentTermsType: "cash",
  creditLimit: 0,
  creditDays: 0,
};

export function hydrateQuickCustomerForm(initialData) {
  if (!initialData) return { ...emptyQuickCustomerForm };
  return {
    displayName: initialData.displayName || "",
    legalName: initialData.legalName || "",
    customerGroupId:
      initialData.customerGroup?._id || initialData.customerGroupId || "",
    phone: initialData.primaryContact?.phone || "",
    email: initialData.primaryContact?.email || "",
    addressLine1: initialData.billingAddress?.line1 || "",
    city: initialData.billingAddress?.city || "",
    paymentTermsType: initialData.paymentTerms?.type || "cash",
    creditLimit: initialData.creditLimit || 0,
    creditDays: initialData.paymentTerms?.creditDays || 0,
  };
}

export function toQuickCustomerPayload(form) {
  return {
    displayName: form.displayName,
    legalName: form.legalName || form.displayName,
    customerGroupId: form.customerGroupId || undefined,
    primaryContact: {
      name: form.displayName,
      phone: form.phone || undefined,
      email: form.email || undefined,
    },
    primaryAddress: form.addressLine1
      ? {
          line1: form.addressLine1,
          city: form.city,
          country: "Sri Lanka",
        }
      : undefined,
    paymentTerms: {
      type: form.paymentTermsType,
      creditDays: form.paymentTermsType === "credit" ? +form.creditDays : 0,
    },
    creditLimit: form.paymentTermsType === "credit" ? +form.creditLimit : 0,
    status: "active",
  };
}

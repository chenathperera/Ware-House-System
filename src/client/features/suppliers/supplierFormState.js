export function supplierFormDefaults() {
  return {
    type: "company",
    category: "raw_material",
    paymentTermsType: "credit",
    creditDays: 30,
    creditLimit: 0,
    status: "active",
    averageLeadTimeDays: 7,
  };
}

export function hydrateSupplierForm(supplier) {
  if (!supplier) return supplierFormDefaults();
  return {
    type: supplier.type || "company",
    companyName: supplier.companyName || "",
    displayName: supplier.displayName || "",
    firstName: supplier.firstName || "",
    lastName: supplier.lastName || "",
    category: supplier.category || "raw_material",
    taxRegistrationNumber: supplier.taxRegistrationNumber || "",
    businessRegistrationNumber: supplier.businessRegistrationNumber || "",
    primaryContact: supplier.primaryContact || {},
    billingAddress: supplier.billingAddress || {},
    shippingAddress: supplier.shippingAddress || {},
    paymentTermsType: supplier.paymentTerms?.type || "credit",
    creditDays: supplier.paymentTerms?.creditDays || 30,
    creditLimit: supplier.paymentTerms?.creditLimit || 0,
    bankName: supplier.bankDetails?.bankName || "",
    branchName: supplier.bankDetails?.branchName || "",
    accountNumber: supplier.bankDetails?.accountNumber || "",
    accountName: supplier.bankDetails?.accountName || "",
    swiftCode: supplier.bankDetails?.swiftCode || "",
    averageLeadTimeDays: supplier.averageLeadTimeDays || 7,
    status: supplier.status || "active",
    notes: supplier.notes || "",
  };
}

export function toSupplierPayload(data) {
  return {
    type: data.type,
    companyName: data.companyName || undefined,
    displayName: data.displayName,
    firstName: data.firstName || undefined,
    lastName: data.lastName || undefined,
    category: data.category,
    taxRegistrationNumber: data.taxRegistrationNumber || undefined,
    businessRegistrationNumber: data.businessRegistrationNumber || undefined,
    primaryContact: data.primaryContact,
    billingAddress: data.billingAddress,
    shippingAddress: data.shippingAddress,
    paymentTerms: {
      type: data.paymentTermsType,
      creditDays: data.creditDays || 0,
      creditLimit: data.creditLimit || 0,
    },
    bankDetails: {
      bankName: data.bankName || undefined,
      branchName: data.branchName || undefined,
      accountNumber: data.accountNumber || undefined,
      accountName: data.accountName || undefined,
      swiftCode: data.swiftCode || undefined,
    },
    averageLeadTimeDays: data.averageLeadTimeDays || 0,
    status: data.status,
    notes: data.notes || undefined,
  };
}

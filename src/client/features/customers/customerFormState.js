export const emptyAddress = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "Sri Lanka",
  postalCode: "",
  phone: "",
  deliveryInstructions: "",
  isDefault: false,
};

export const emptyContact = {
  name: "",
  designation: "",
  email: "",
  phone: "",
  role: "other",
  isPrimary: false,
};

export function customerFormDefaults() {
  return {
    customerType: "company",
    businessType: "retailer",
    status: "active",
    paymentTermsType: "cod",
    creditDays: 0,
    creditLimit: 0,
    defaultDiscountPercent: 0,
    shippingAddresses: [{ ...emptyAddress, isDefault: true }],
    contacts: [],
    billingAddress: { ...emptyAddress, isDefault: true },
  };
}

export function hydrateCustomerForm(customer) {
  if (!customer) return customerFormDefaults();
  return {
    customerType: customer.customerType || "company",
    businessType: customer.businessType || "retailer",
    companyName: customer.companyName || "",
    displayName: customer.displayName || "",
    firstName: customer.firstName || "",
    lastName: customer.lastName || "",
    customerGroupId:
      customer.customerGroupId?._id || customer.customerGroupId || "",
    taxRegistrationNumber: customer.taxRegistrationNumber || "",
    businessRegistrationNumber: customer.businessRegistrationNumber || "",
    industry: customer.industry || "",
    primaryContact: customer.primaryContact || {},
    billingAddress: customer.billingAddress || {
      ...emptyAddress,
      isDefault: true,
    },
    shippingAddresses: customer.shippingAddresses?.length
      ? customer.shippingAddresses
      : [{ ...emptyAddress, isDefault: true }],
    contacts: customer.contacts || [],
    assignedSalesRep:
      customer.assignedSalesRep?._id || customer.assignedSalesRep || "",
    paymentTermsType: customer.paymentTerms?.type || "cod",
    creditDays: customer.paymentTerms?.creditDays || 0,
    creditLimit: customer.paymentTerms?.creditLimit || 0,
    defaultDiscountPercent: customer.defaultDiscountPercent || 0,
    status: customer.status || "active",
    notes: customer.notes || "",
  };
}

export function toCustomerPayload(data) {
  return {
    customerType: data.customerType,
    businessType: data.businessType,
    companyName: data.companyName || undefined,
    displayName: data.displayName,
    firstName: data.firstName || undefined,
    lastName: data.lastName || undefined,
    customerGroupId: data.customerGroupId || undefined,
    taxRegistrationNumber: data.taxRegistrationNumber || undefined,
    businessRegistrationNumber: data.businessRegistrationNumber || undefined,
    industry: data.industry || undefined,
    primaryContact: data.primaryContact,
    billingAddress: data.billingAddress,
    shippingAddresses: data.shippingAddresses?.filter(
      (address) => address.line1,
    ),
    contacts: data.contacts?.filter((contact) => contact.name),
    assignedSalesRep: data.assignedSalesRep || undefined,
    paymentTerms: {
      type: data.paymentTermsType,
      creditDays: data.creditDays || 0,
      creditLimit: data.creditLimit || 0,
    },
    defaultDiscountPercent: data.defaultDiscountPercent || 0,
    status: data.status,
    notes: data.notes || undefined,
  };
}

import "server-only";
import { z } from "zod";
const address = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});
const contact = z.object({
  name: z.string().optional(),
  designation: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});
export const createSupplierSchema = z.object({
  type: z.enum(["company", "individual"]).optional(),
  companyName: z.string().max(200).optional(),
  displayName: z.string().min(1, "Display name required").max(100),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  category: z
    .enum([
      "raw_material",
      "packaging",
      "services",
      "equipment",
      "finished_goods",
      "multiple",
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  businessRegistrationNumber: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  country: z.string().optional(),
  primaryContact: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      mobile: z.string().optional(),
    })
    .optional(),
  contacts: z.array(contact).optional(),
  billingAddress: address.optional(),
  shippingAddress: address.optional(),
  paymentTerms: z
    .object({
      type: z.enum(["advance", "cod", "credit", "consignment"]).optional(),
      creditDays: z.number().min(0).optional(),
      creditLimit: z.number().min(0).optional(),
    })
    .optional(),
  defaultCurrency: z.string().optional(),
  bankDetails: z.object({ bankName: z.string().optional(), branchName: z.string().optional(), accountNumber: z.string().optional(), accountName: z.string().optional(), swiftCode: z.string().optional() }).optional(),
  shippingTerms: z.string().optional(),
  averageLeadTimeDays: z.number().min(0).optional(),
  status: z.enum(["active", "inactive", "blacklisted", "on_hold"]).optional(),
  blacklistReason: z.string().optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
});
export const updateSupplierSchema = createSupplierSchema.partial();

import { z } from "zod";

export const customerFormSchema = z.object({
  customerType: z.enum(["company", "individual"]),
  businessType: z.enum([
    "wholesaler",
    "retailer",
    "distributor",
    "reseller",
    "end_user",
    "other",
  ]),
  displayName: z.string().min(1, "Display name is required").max(100),
  companyName: z.string().max(200).optional().or(z.literal("")),
  customerGroupId: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  paymentTermsType: z.enum(["advance", "cod", "credit"]),
  creditDays: z.coerce.number().min(0).optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  defaultDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["active", "inactive", "blacklisted", "on_hold", "prospect"]),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

import { z } from "zod";

export const customerGroupFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  description: z.string().max(500).optional().or(z.literal("")),
  paymentType: z.enum(["advance", "cod", "credit"]),
  creditDays: z.coerce.number().min(0).optional(),
  defaultCreditLimit: z.coerce.number().min(0).optional(),
  defaultDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  priority: z.coerce.number().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

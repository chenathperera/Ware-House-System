import "server-only";
import { z } from "zod";

export const createCustomerGroupSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  defaultPaymentTerms: z.object({
    type: z.enum(["advance", "cod", "credit"]).optional(),
    creditDays: z.number().min(0).optional(),
    defaultCreditLimit: z.number().min(0).optional(),
  }).optional(),
  defaultDiscountPercent: z.number().min(0).max(100).optional(),
  priority: z.number().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateCustomerGroupSchema = createCustomerGroupSchema.partial();

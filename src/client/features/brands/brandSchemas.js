import { z } from "zod";

export const brandFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().max(20).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  isOwnBrand: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

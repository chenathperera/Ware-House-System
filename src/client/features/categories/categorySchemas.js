import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  description: z.string().max(500).optional().or(z.literal("")),
  parentCategory: z.string().optional().or(z.literal("")),
  type: z.enum(["product", "raw_material", "both"]),
  isActive: z.boolean().optional(),
});

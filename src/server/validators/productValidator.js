import "server-only";
import { z } from "zod";
const id = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");
export const createProductSchema = z.object({
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  name: z.string().min(1).max(200),
  productType: z
    .enum([
      "finished_good",
      "raw_material",
      "semi_finished",
      "packaging",
      "service",
      "consumable",
    ])
    .optional(),
  canBeManufactured: z.boolean().optional(),
  canBePurchased: z.boolean().optional(),
  canBeSold: z.boolean().optional(),
  shortName: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  categoryId: id,
  brandId: id.optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  type: z.enum(["manufactured", "trading", "service", "bundle"]).optional(),
  unitOfMeasure: z.string().min(1),
  basePrice: z.number().min(0),
  purchasePrice: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
  callPrice: z.number().min(0).optional(),
  status: z.enum(["active", "inactive", "draft", "discontinued"]).optional(),
  notes: z.string().max(1000).optional(),
});
export const updateProductSchema = createProductSchema.partial();

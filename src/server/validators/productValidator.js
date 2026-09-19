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
  brandId: id.optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(["manufactured", "trading", "service", "bundle"]).optional(),
  unitOfMeasure: z.string().min(1),
  basePrice: z.number().min(0),
  purchasePrice: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
  callPrice: z.number().min(0).optional(),
  tierPricing: z
    .array(
      z.object({
        tierName: z.string(),
        minQuantity: z.number().min(0),
        maxQuantity: z.number().optional(),
        price: z.number().min(0),
      }),
    )
    .optional(),
  tax: z.object({ taxable: z.boolean().optional(), taxRate: z.number().min(0).max(100).optional(), hsCode: z.string().optional() }).optional(),
  costs: z.object({ lastPurchaseCost: z.number().min(0).optional(), averageCost: z.number().min(0).optional(), standardCost: z.number().min(0).optional() }).optional(),
  stockLevels: z.object({ minimumLevel: z.number().min(0).optional(), reorderLevel: z.number().min(0).optional(), maximumLevel: z.number().min(0).optional() }).optional(),
  packaging: z.object({ unitsPerCarton: z.number().min(0).optional(), cartonsPerPallet: z.number().min(0).optional() }).optional(),
  salesConfig: z.object({ sellable: z.boolean().optional(), minimumOrderQuantity: z.number().min(0).optional(), allowBackorder: z.boolean().optional() }).optional(),
  status: z.enum(["active", "inactive", "draft", "discontinued"]).optional(),
  notes: z.string().max(1000).optional(),
});
export const updateProductSchema = createProductSchema.partial();

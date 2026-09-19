import { z } from "zod";
const empty = z.string().optional().or(z.literal(""));
export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  shortName: z.string().max(100).optional().or(z.literal("")),
  sku: z.string().max(50).optional().or(z.literal("")),
  barcode: z.string().max(50).optional().or(z.literal("")),
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
  canBeSold: z.boolean().optional(),
  canBePurchased: z.boolean().optional(),
  canBeManufactured: z.boolean().optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
  brandId: empty,
  type: z.enum(["manufactured", "trading", "service", "bundle"]),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  basePrice: z.coerce.number().min(0),
  buyingPrice: z.coerce.number().min(0).optional(),
  profitPercentage: z.coerce.number().optional(),
  mrp: z.coerce.number().min(0).optional(),
  callPrice: z.coerce.number().min(0).optional(),
  minimumLevel: z.coerce.number().min(0).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  maximumLevel: z.coerce.number().min(0).optional(),
  unitsPerCarton: z.coerce.number().min(0).optional(),
  cartonsPerPallet: z.coerce.number().min(0).optional(),
  minimumOrderQuantity: z.coerce.number().min(0).optional(),
  sellable: z.boolean().optional(),
  allowBackorder: z.boolean().optional(),
  status: z.enum(["active", "inactive", "draft", "discontinued"]),
  notes: z.string().max(1000).optional().or(z.literal("")),
  productNature: z.enum(["single", "variable", "combo"]).optional(),
  variations: z
    .array(
      z.object({
        sku: empty,
        name: z.string().min(1, "Name is required"),
        barcode: empty,
        attributeName: empty,
        attributeValue: empty,
        purchasePrice: z.coerce.number().min(0).optional(),
        price: z.coerce.number().min(0),
        stock: z.coerce.number().optional(),
      }),
    )
    .optional(),
  comboItems: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.coerce.number().min(1),
        priceContribution: z.coerce.number().optional(),
      }),
    )
    .optional(),
  tierPricing: z
    .array(
      z.object({
        tierName: empty,
        minQuantity: z.coerce.number().min(0),
        maxQuantity: z.coerce.number().optional().nullable(),
        price: z.coerce.number().min(0),
      }),
    )
    .optional(),
});

import "server-only";
import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const purchaseOrderLineSchema = z.object({
  productId: objectId,
  orderedQuantity: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(0),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).optional(),
  taxable: z.boolean().optional(),
  notes: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: objectId,
  deliverTo: z.object({ warehouseId: objectId }),
  poDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  items: z.array(purchaseOrderLineSchema).min(1, "At least one item required"),
  shippingCost: z.coerce.number().min(0).optional(),
  otherCharges: z.coerce.number().min(0).optional(),
  shippingTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  status: z.enum(["draft", "approved"]).optional(),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

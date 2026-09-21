import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const line = z.object({
  poLineItemId: objectId.optional(), productId: objectId,
  receivedQuantity: z.coerce.number().min(0), acceptedQuantity: z.coerce.number().min(0).optional(),
  rejectedQuantity: z.coerce.number().min(0).optional(), damagedQuantity: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0), batchNumber: z.string().optional(), manufactureDate: z.string().optional(),
  expiryDate: z.string().optional(), rejectionReason: z.string().optional(), notes: z.string().optional(),
});
export const createGrnSchema = z.object({
  purchaseOrderId: objectId.optional(), supplierId: objectId.optional(), warehouseId: objectId,
  receiptDate: z.string().optional(), supplierDeliveryNoteNumber: z.string().optional(), supplierInvoiceNumber: z.string().optional(),
  vehicleNumber: z.string().optional(), driverName: z.string().optional(), transportCompany: z.string().optional(),
  items: z.array(line).min(1), notes: z.string().optional(),
  billDiscountPercent: z.coerce.number().min(0).max(100).optional(), billDiscountAmount: z.coerce.number().min(0).optional(),
});

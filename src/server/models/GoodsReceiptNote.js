import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const lineSchema = new mongoose.Schema({
  poLineItemId: mongoose.Schema.Types.ObjectId,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productCode: String,
  productName: String,
  orderedQuantity: Number,
  receivedQuantity: { type: Number, required: true, min: 0 },
  acceptedQuantity: { type: Number, default: 0 },
  rejectedQuantity: { type: Number, default: 0 },
  damagedQuantity: { type: Number, default: 0 },
  unitOfMeasure: String,
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  freeQuantity: { type: Number, default: 0 },
  batchNumber: String,
  manufactureDate: Date,
  expiryDate: Date,
  qcStatus: { type: String, enum: ["not_required", "pending", "passed", "failed", "partially_passed"], default: "not_required" },
  rejectionReason: String,
  notes: String,
  stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: "StockMovement" },
}, { _id: true });

const schema = new mongoose.Schema({
  grnNumber: { type: String, unique: true, trim: true, uppercase: true },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: false },
  poNumber: { type: String, required: false },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierName: String,
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  receiptDate: { type: Date, default: Date.now },
  supplierDeliveryNoteNumber: String,
  supplierInvoiceNumber: String,
  vehicleNumber: String,
  driverName: String,
  transportCompany: String,
  items: [lineSchema],
  billDiscountPercent: { type: Number, default: 0 },
  billDiscountAmount: { type: Number, default: 0 },
  totalReceivedValue: { type: Number, default: 0 },
  totalAcceptedValue: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "received", "qc_pending", "completed", "rejected"], default: "draft" },
  hasDiscrepancy: { type: Boolean, default: false },
  discrepancyNotes: String,
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ purchaseOrderId: 1 });
schema.index({ supplierId: 1, receiptDate: -1 });
schema.index({ status: 1 });
schema.pre("save", async function () {
  if (this.isNew && !this.grnNumber) this.grnNumber = `GRN-${await getNextSequence("grn")}`;
  const calculate = (quantity) => this.items.reduce((sum, item) => {
    const lineTotal = (item[quantity] || item.receivedQuantity || 0) * item.unitPrice;
    const discount = item.discountAmount || (lineTotal * (item.discountPercent || 0) / 100);
    return sum + Math.max(0, lineTotal - discount);
  }, 0);
  const received = calculate("receivedQuantity");
  const accepted = calculate("acceptedQuantity");
  this.totalReceivedValue = +Math.max(0, received - received * (this.billDiscountPercent || 0) / 100 - (this.billDiscountAmount || 0)).toFixed(2);
  this.totalAcceptedValue = +Math.max(0, accepted - accepted * (this.billDiscountPercent || 0) / 100 - (this.billDiscountAmount || 0)).toFixed(2);
});
schema.pre(/^find/, function (next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
  if (typeof next === "function") next();
});

export default mongoose.models.GoodsReceiptNote || mongoose.model("GoodsReceiptNote", schema);

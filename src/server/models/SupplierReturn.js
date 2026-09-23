import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productCode: String,
  productName: String,
  grnId: { type: mongoose.Schema.Types.ObjectId, ref: "GoodsReceiptNote" },
  poId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
  quantity: { type: Number, required: true, min: 0.01 },
  unitOfMeasure: String,
  unitPrice: { type: Number, required: true },
  reason: { type: String, enum: ["damaged", "defective", "wrong_item", "expired", "quality_issue", "other"], required: true },
  reasonDescription: String,
  stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: "StockMovement" },
}, { _id: true });

const schema = new mongoose.Schema({
  returnNumber: { type: String, unique: true, trim: true, uppercase: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierSnapshot: { name: String, code: String },
  returnDate: { type: Date, default: Date.now },
  expectedCreditDate: Date,
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  items: [itemSchema],
  totalReturnValue: { type: Number, default: 0 },
  expectedCreditAmount: { type: Number, default: 0 },
  actualCreditReceived: { type: Number, default: 0 },
  creditReceivedDate: Date,
  creditReferenceNumber: String,
  status: { type: String, enum: ["draft", "approved", "sent", "credit_received", "cancelled"], default: "draft" },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ supplierId: 1, returnDate: -1 });
schema.pre("save", async function () {
  if (this.isNew && !this.returnNumber) this.returnNumber = `SRT-${await getNextSequence("supplier_return")}`;
  this.totalReturnValue = +this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2);
  if (!this.expectedCreditAmount) this.expectedCreditAmount = this.totalReturnValue;
});
schema.pre(/^find/, function (next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
  if (typeof next === "function") next();
});

export default mongoose.models.SupplierReturn || mongoose.model("SupplierReturn", schema);

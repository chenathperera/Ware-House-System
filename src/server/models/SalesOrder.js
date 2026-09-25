import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const addressSnapshotSchema = new mongoose.Schema(
  {
    label: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    phone: String,
  },
  { _id: false },
);

const lineItemSchema = new mongoose.Schema({
  lineNumber: Number,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variationId: mongoose.Schema.Types.ObjectId,
  productCode: { type: String, trim: true },
  productName: { type: String, trim: true },
  description: { type: String, trim: true },
  orderedQuantity: { type: Number, required: true, min: 0.01 },
  dispatchedQuantity: { type: Number, default: 0 },
  deliveredQuantity: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
  unitOfMeasure: { type: String, trim: true },
  listPrice: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  taxable: { type: Boolean, default: true },
  lineSubtotal: { type: Number, default: 0 },
  lineDiscount: { type: Number, default: 0 },
  lineTax: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
  lineStatus: {
    type: String,
    enum: ["pending", "dispatched", "delivered", "cancelled", "returned"],
    default: "pending",
  },
  notes: { type: String, trim: true },
});

const salesOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, trim: true, uppercase: true },
    source: {
      type: String,
      enum: ["direct", "quotation", "field_rep", "phone", "whatsapp", "recurring", "pos"],
      default: "direct",
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: [true, "Customer is required"] },
    sourceWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    sourceWarehouseSnapshot: { name: String, warehouseCode: String },
    customerSnapshot: { name: String, code: String, taxRegistrationNumber: String, contactName: String, phone: String },
    billingAddress: addressSnapshotSchema,
    shippingAddress: addressSnapshotSchema,
    shippingAddressLabel: { type: String, trim: true },
    salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    orderDate: { type: Date, default: Date.now },
    requestedDeliveryDate: Date,
    committedDeliveryDate: Date,
    currency: { type: String, default: "LKR" },
    items: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    roundingAdjustment: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    orderDiscount: { type: { type: String, enum: ["percentage", "fixed"] }, value: { type: Number, default: 0 }, amount: { type: Number, default: 0 }, reason: String },
    paymentTerms: { type: { type: String, enum: ["advance", "cod", "credit"] }, creditDays: Number, dueDate: Date },
    status: { type: String, enum: ["draft", "pending_approval", "approved", "partially_dispatched", "dispatched", "partially_delivered", "delivered", "invoiced", "completed", "on_hold", "cancelled"], default: "draft" },
    isOnHold: { type: Boolean, default: false },
    holdReason: String,
    creditCheck: { performed: { type: Boolean, default: false }, passed: Boolean, creditAvailable: Number, creditRequired: Number, overridden: { type: Boolean, default: false }, overrideReason: String, overrideBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    customerNotes: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    specialInstructions: { type: String, trim: true },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    cancellationReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    cashReceived: Number,
    changeReturned: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

salesOrderSchema.index({ sourceWarehouseId: 1, status: 1 });
salesOrderSchema.index({ customerId: 1, orderDate: -1 });
salesOrderSchema.index({ status: 1, orderDate: -1 });
salesOrderSchema.index({ salesRepId: 1, orderDate: -1 });
salesOrderSchema.index({ orderDate: -1 });

salesOrderSchema.pre("save", async function () {
  if (this.isNew && !this.orderNumber) this.orderNumber = `SO-${await getNextSequence("sales_order")}`;
  this.items.forEach((item, index) => {
    item.lineNumber = index + 1;
    item.lineSubtotal = +(item.orderedQuantity * item.unitPrice).toFixed(2);
    item.lineDiscount = +(item.lineSubtotal * (item.discountPercent || 0) / 100 + (item.discountAmount || 0)).toFixed(2);
    const taxable = item.lineSubtotal - item.lineDiscount;
    item.lineTax = item.taxable ? +(taxable * (item.taxRate || 0) / 100).toFixed(2) : 0;
    item.taxAmount = item.lineTax;
    item.lineTotal = +(taxable + item.lineTax).toFixed(2);
  });
  this.subtotal = +this.items.reduce((sum, item) => sum + item.lineSubtotal, 0).toFixed(2);
  this.totalDiscount = +this.items.reduce((sum, item) => sum + item.lineDiscount, 0).toFixed(2);
  this.totalTax = +this.items.reduce((sum, item) => sum + item.lineTax, 0).toFixed(2);
  let orderLevelDiscount = 0;
  if (this.orderDiscount?.type === "percentage") orderLevelDiscount = +((this.subtotal - this.totalDiscount) * (this.orderDiscount.value || 0) / 100).toFixed(2);
  else if (this.orderDiscount?.type === "fixed") orderLevelDiscount = this.orderDiscount.value || 0;
  if (this.orderDiscount) this.orderDiscount.amount = orderLevelDiscount;
  this.grandTotal = +(this.subtotal - this.totalDiscount - orderLevelDiscount + this.totalTax + (this.shippingCost || 0) + (this.otherCharges || 0) + (this.roundingAdjustment || 0)).toFixed(2);
  if (this.paymentTerms?.type === "credit" && this.paymentTerms.creditDays && !this.paymentTerms.dueDate) {
    const due = new Date(this.orderDate);
    due.setDate(due.getDate() + this.paymentTerms.creditDays);
    this.paymentTerms.dueDate = due;
  }
});

salesOrderSchema.pre(/^find/, function (next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
  if (typeof next === "function") next();
});

export default mongoose.models.SalesOrder || mongoose.model("SalesOrder", salesOrderSchema);

import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    attentionTo: { type: String, trim: true },
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: "Sri Lanka" },
    postalCode: { type: String, trim: true },
    phone: { type: String, trim: true },
    deliveryInstructions: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ["owner", "purchasing", "accounts", "logistics", "other"],
      default: "other",
    },
    isPrimary: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { _id: true },
);

const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, unique: true, trim: true, uppercase: true },
    customerType: {
      type: String,
      enum: ["company", "individual"],
      default: "company",
    },
    businessType: {
      type: String,
      enum: [
        "wholesaler",
        "retailer",
        "distributor",
        "reseller",
        "end_user",
        "other",
      ],
      default: "retailer",
    },
    companyName: { type: String, trim: true, maxlength: 200 },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: 100,
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    customerGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerGroup",
    },
    tags: [{ type: String, trim: true }],
    businessRegistrationNumber: { type: String, trim: true },
    taxRegistrationNumber: { type: String, trim: true },
    industry: { type: String, trim: true },
    primaryContact: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      mobile: { type: String, trim: true },
    },
    contacts: [contactSchema],
    billingAddress: addressSchema,
    shippingAddresses: [addressSchema],
    assignedSalesRep: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paymentTerms: {
      type: {
        type: String,
        enum: ["advance", "cod", "credit"],
        default: "cod",
      },
      creditDays: { type: Number, default: 0, min: 0 },
      creditLimit: { type: Number, default: 0, min: 0 },
    },
    defaultDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    creditStatus: {
      currentBalance: { type: Number, default: 0 },
      overdueAmount: { type: Number, default: 0 },
      availableCredit: { type: Number, default: 0 },
      isOverdue: { type: Boolean, default: false },
      daysPastDue: { type: Number, default: 0 },
      onCreditHold: { type: Boolean, default: false },
      creditHoldReason: { type: String, trim: true },
    },
    analytics: {
      totalOrders: { type: Number, default: 0 },
      totalOrderValue: { type: Number, default: 0 },
      totalPaidAmount: { type: Number, default: 0 },
      lastOrderDate: { type: Date },
      lastPaymentDate: { type: Date },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blacklisted", "on_hold", "prospect"],
      default: "active",
    },
    blacklistReason: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    internalNotes: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

customerSchema.index({ displayName: "text", companyName: "text" });
customerSchema.index({ customerGroupId: 1, status: 1 });
customerSchema.index({ assignedSalesRep: 1 });
customerSchema.index({ status: 1 });
customerSchema.pre("save", async function () {
  if (this.isNew && !this.customerCode)
    this.customerCode = `CUST-${await getNextSequence("customer")}`;
  if (this.paymentTerms?.creditLimit !== undefined)
    this.creditStatus.availableCredit = Math.max(
      0,
      (this.paymentTerms.creditLimit || 0) -
        (this.creditStatus.currentBalance || 0),
    );
});
customerSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
});

export default mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);

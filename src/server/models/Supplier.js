import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { _id: true },
);
const addressSchema = {
  line1: String,
  line2: String,
  city: String,
  state: String,
  country: { type: String, default: "Sri Lanka" },
  postalCode: String,
};
const supplierSchema = new mongoose.Schema(
  {
    supplierCode: { type: String, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ["company", "individual"], default: "company" },
    companyName: { type: String, trim: true, maxlength: 200 },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: 100,
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    category: {
      type: String,
      enum: [
        "raw_material",
        "packaging",
        "services",
        "equipment",
        "finished_goods",
        "multiple",
      ],
      default: "multiple",
    },
    tags: [{ type: String, trim: true }],
    businessRegistrationNumber: { type: String, trim: true },
    taxRegistrationNumber: { type: String, trim: true },
    country: { type: String, trim: true, default: "Sri Lanka" },
    primaryContact: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      mobile: { type: String, trim: true },
    },
    contacts: [contactSchema],
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    paymentTerms: {
      type: {
        type: String,
        enum: ["advance", "cod", "credit", "consignment"],
        default: "credit",
      },
      creditDays: { type: Number, default: 30, min: 0 },
      creditLimit: { type: Number, default: 0, min: 0 },
    },
    defaultCurrency: { type: String, default: "LKR" },
    bankDetails: {
      bankName: String,
      branchName: String,
      accountNumber: String,
      accountName: String,
      swiftCode: String,
    },
    shippingTerms: { type: String, trim: true },
    averageLeadTimeDays: { type: Number, default: 7 },
    performance: {
      totalOrders: { type: Number, default: 0 },
      totalPurchaseValue: { type: Number, default: 0 },
      onTimeDeliveryRate: { type: Number, default: 0 },
      qualityRejectRate: { type: Number, default: 0 },
      lastOrderDate: Date,
      rating: { type: Number, default: 0, min: 0, max: 5 },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blacklisted", "on_hold"],
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
supplierSchema.index({
  displayName: "text",
  companyName: "text",
  supplierCode: "text",
});
supplierSchema.index({ category: 1, status: 1 });
supplierSchema.index({ status: 1 });
supplierSchema.pre("save", async function () {
  if (this.isNew && !this.supplierCode)
    this.supplierCode = `SUP-${await getNextSequence("supplier")}`;
});
supplierSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
});
export default mongoose.models.Supplier ||
  mongoose.model("Supplier", supplierSchema);

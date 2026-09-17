import "server-only";
import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    warehouseCode: {
      type: String,
      required: [true, "Warehouse code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    name: {
      type: String,
      required: [true, "Warehouse name is required"],
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["main", "branch", "transit", "virtual", "quarantine", "scrap", "van"],
      default: "main",
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: "Sri Lanka" },
      postalCode: { type: String, trim: true },
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    warehouseManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedRep: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    capabilities: {
      canShipDirectly: { type: Boolean, default: true },
      canReceiveGoods: { type: Boolean, default: true },
      temperatureControlled: { type: Boolean, default: false },
      hasRefrigeration: { type: Boolean, default: false },
    },
    zones: [
      {
        code: { type: String, trim: true, uppercase: true },
        name: { type: String, trim: true },
        type: {
          type: String,
          enum: ["receiving", "storage", "picking", "packing", "dispatch", "returns", "quarantine"],
          default: "storage",
        },
        isActive: { type: Boolean, default: true },
      },
    ],
    settings: {
      pickingStrategy: {
        type: String,
        enum: ["FIFO", "LIFO", "FEFO"],
        default: "FIFO",
      },
      allowNegativeStock: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

warehouseSchema.index({ name: 1, isActive: 1 });
warehouseSchema.index({ isDefault: 1 });

warehouseSchema.pre(/^find/, function () {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

const Warehouse = mongoose.models.Warehouse || mongoose.model("Warehouse", warehouseSchema);

export default Warehouse;

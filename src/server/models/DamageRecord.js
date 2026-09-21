import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const schema = new mongoose.Schema({
  damageNumber: { type: String, unique: true, trim: true, uppercase: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productCode: String, productName: String,
  quantity: { type: Number, required: true, min: 0.01 }, unitOfMeasure: String,
  costPerUnit: { type: Number, default: 0 }, totalValue: { type: Number, default: 0 },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  source: { type: String, enum: ["production_reject", "warehouse_damage", "customer_return", "supplier_delivery", "transit", "expired", "theft", "other"], required: true },
  sourceDocument: { type: { type: String }, id: mongoose.Schema.Types.ObjectId, number: String },
  description: String,
  disposition: { type: String, enum: ["pending", "scrap", "repair", "return_to_supplier", "write_off"], default: "pending" },
  writtenOff: { type: Boolean, default: false }, writtenOffAt: Date, writeOffValue: { type: Number, default: 0 },
  stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: "StockMovement" }, stockAdjusted: { type: Boolean, default: false },
  photos: [String], notes: String,
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, approvedAt: Date,
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ productId: 1, createdAt: -1 }); schema.index({ source: 1, disposition: 1 });
schema.pre("save", async function () { if (this.isNew && !this.damageNumber) this.damageNumber = `DMG-${await getNextSequence("damage")}`; this.totalValue = +(this.quantity * (this.costPerUnit || 0)).toFixed(2); });
schema.pre(/^find/, function (next) { if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null }); if (typeof next === "function") next(); });
export default mongoose.models.DamageRecord || mongoose.model("DamageRecord", schema);

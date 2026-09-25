import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const componentSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productCode: String, productName: String, productType: String,
  quantity: { type: Number, required: true, min: 0.0001 }, unitOfMeasure: String,
  componentType: { type: String, enum: ["raw_material", "semi_finished", "packaging", "consumable"], default: "raw_material" },
  wastagePercent: { type: Number, default: 0, min: 0, max: 100 }, standardCost: { type: Number, default: 0 },
  productionStep: { type: Number, default: 1 }, isOptional: { type: Boolean, default: false }, notes: String,
}, { _id: true });
const laborSchema = new mongoose.Schema({
  laborType: { type: String, enum: ["skilled", "unskilled", "supervisor", "machinist", "general"], default: "general" },
  description: String, hours: { type: Number, required: true, min: 0 }, hourlyRate: { type: Number, default: 0 }, totalCost: { type: Number, default: 0 },
}, { _id: true });
const schema = new mongoose.Schema({
  bomCode: { type: String, unique: true, trim: true, uppercase: true },
  name: { type: String, required: [true, "BOM name is required"], trim: true, maxlength: 200 }, version: { type: String, default: "1.0", trim: true },
  finishedProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, finishedProductCode: String, finishedProductName: String,
  outputQuantity: { type: Number, required: true, min: 0.01, default: 1 }, outputUnitOfMeasure: String,
  components: [componentSchema], labor: [laborSchema], totalMaterialCost: { type: Number, default: 0 }, totalLaborCost: { type: Number, default: 0 }, overheadPercent: { type: Number, default: 0 }, totalOverheadCost: { type: Number, default: 0 }, totalCost: { type: Number, default: 0 }, costPerUnit: { type: Number, default: 0 }, estimatedProductionTimeHours: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "active", "inactive", "archived"], default: "active" }, isDefault: { type: Boolean, default: true }, effectiveFrom: Date, effectiveUntil: Date, notes: String, internalNotes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ finishedProductId: 1, isDefault: 1, status: 1 }); schema.index({ status: 1 });
schema.pre("save", async function () {
  if (this.isNew && !this.bomCode) this.bomCode = `BOM-${await getNextSequence("bom")}`;
  this.totalMaterialCost = +this.components.reduce((sum, item) => sum + item.quantity * (1 + (item.wastagePercent || 0) / 100) * (item.standardCost || 0), 0).toFixed(2);
  this.totalLaborCost = +this.labor.reduce((sum, item) => { item.totalCost = +(item.hours * item.hourlyRate).toFixed(2); return sum + item.totalCost; }, 0).toFixed(2);
  this.totalOverheadCost = +((this.totalMaterialCost + this.totalLaborCost) * (this.overheadPercent || 0) / 100).toFixed(2);
  this.totalCost = +(this.totalMaterialCost + this.totalLaborCost + this.totalOverheadCost).toFixed(2);
  this.costPerUnit = this.outputQuantity > 0 ? +(this.totalCost / this.outputQuantity).toFixed(2) : 0;
});
schema.pre(/^find/, function (next) { if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null }); if (typeof next === "function") next(); });
export default mongoose.models.BillOfMaterials || mongoose.model("BillOfMaterials", schema);

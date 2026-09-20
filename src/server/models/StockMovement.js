import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const stockMovementSchema = new mongoose.Schema({
  movementNumber: { type: String, unique: true, trim: true, uppercase: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productCode: { type: String, trim: true }, productName: { type: String, trim: true },
  batchNumber: { type: String, trim: true, default: null },
  movementType: { type: String, required: true, enum: ["opening_stock", "purchase_receipt", "sale_dispatch", "sale_return", "transfer_out", "transfer_in", "adjustment_in", "adjustment_out", "reservation", "reservation_release", "production_consume", "production_output", "production_scrap", "damage", "supplier_return", "repair_in", "write_off"] },
  direction: { type: String, enum: ["in", "out", "reserve", "unreserve"], required: true },
  quantity: { type: Number, required: true, min: 0.01 }, unitOfMeasure: { type: String, trim: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }, fromWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }, toWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  costPerUnit: { type: Number, default: 0 }, totalCost: { type: Number, default: 0 }, balanceBefore: { type: Number, default: 0 }, balanceAfter: { type: Number, default: 0 },
  sourceDocument: { type: { type: String, enum: ["sales_order", "opening_stock", "stock_transfer", "stock_adjustment", "manual", "purchase_receipt", "grn", "supplier_return", "production_order", "customer_return", "damage_record", "repair_order"] }, id: { type: mongoose.Schema.Types.ObjectId }, number: { type: String, trim: true } },
  reason: { type: String, trim: true }, notes: { type: String, trim: true }, performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
stockMovementSchema.index({ productId: 1, timestamp: -1 }); stockMovementSchema.index({ warehouseId: 1, timestamp: -1 }); stockMovementSchema.index({ movementType: 1, timestamp: -1 }); stockMovementSchema.index({ "sourceDocument.id": 1 });
stockMovementSchema.pre("save", async function () { if (this.isNew && !this.movementNumber) this.movementNumber = `MOV-${await getNextSequence("stock_movement")}`; });
export default mongoose.models.StockMovement || mongoose.model("StockMovement", stockMovementSchema);

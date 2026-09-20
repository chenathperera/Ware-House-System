import "server-only";
import mongoose from "mongoose";
const stockReservationSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true }, batchNumber: { type: String, trim: true, default: null }, quantity: { type: Number, required: true, min: 0.01 }, unitOfMeasure: { type: String, trim: true },
  sourceDocument: { type: { type: String, enum: ["sales_order", "production_order"], default: "sales_order" }, id: { type: mongoose.Schema.Types.ObjectId, required: true }, number: { type: String, trim: true }, lineItemId: { type: mongoose.Schema.Types.ObjectId } },
  status: { type: String, enum: ["active", "fulfilled", "cancelled"], default: "active" }, reservedAt: { type: Date, default: Date.now }, reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, fulfilledAt: { type: Date }, cancelledAt: { type: Date }, cancellationReason: { type: String, trim: true },
}, { timestamps: true });
stockReservationSchema.index({ productId: 1, warehouseId: 1, status: 1 }); stockReservationSchema.index({ "sourceDocument.id": 1, status: 1 });
export default mongoose.models.StockReservation || mongoose.model("StockReservation", stockReservationSchema);

import "server-only";
import mongoose from "mongoose";

// This is the minimum persistence dependency used by Product creation and
// updates. It intentionally does not add Stock routes, pages, adjustments,
// transfers, or movement workflows.
const stockItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    productCode: { type: String, trim: true },
    productName: { type: String, trim: true },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    batchNumber: { type: String, trim: true, default: null },
    manufactureDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    quantities: {
      onHand: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
    },
    unitOfMeasure: { type: String, trim: true },
    costPerUnit: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    lastMovementDate: { type: Date },
    lastCountDate: { type: Date },
  },
  { timestamps: true },
);

stockItemSchema.index(
  { productId: 1, warehouseId: 1, batchNumber: 1, variationId: 1 },
  { unique: true },
);
stockItemSchema.index({ warehouseId: 1, productId: 1 });
stockItemSchema.index({ "quantities.available": 1 });
stockItemSchema.index({ expiryDate: 1 });

stockItemSchema.pre("save", function () {
  this.quantities.available = Math.max(0, this.quantities.onHand - this.quantities.reserved);
  this.totalValue = +(this.quantities.onHand * this.costPerUnit).toFixed(2);
});

export default mongoose.models.StockItem || mongoose.model("StockItem", stockItemSchema);

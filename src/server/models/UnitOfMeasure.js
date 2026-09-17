import "server-only";
import mongoose from "mongoose";

const unitOfMeasureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "UOM name is required"],
      trim: true,
      unique: true,
      maxlength: 50,
    },
    symbol: {
      type: String,
      required: [true, "Symbol is required"],
      trim: true,
      unique: true,
      maxlength: 10,
    },
    type: {
      type: String,
      enum: ["weight", "volume", "count", "length", "area", "time"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const UnitOfMeasure =
  mongoose.models.UnitOfMeasure || mongoose.model("UnitOfMeasure", unitOfMeasureSchema);

export default UnitOfMeasure;

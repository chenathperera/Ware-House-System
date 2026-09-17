import "server-only";
import mongoose from "mongoose";

const customerGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Group name is required"], trim: true, unique: true, maxlength: 100 },
    code: { type: String, required: [true, "Group code is required"], trim: true, unique: true, uppercase: true, maxlength: 20 },
    description: { type: String, trim: true, maxlength: 500 },
    defaultPaymentTerms: {
      type: { type: String, enum: ["advance", "cod", "credit"], default: "cod" },
      creditDays: { type: Number, default: 0, min: 0 },
      defaultCreditLimit: { type: Number, default: 0, min: 0 },
    },
    defaultDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    priority: { type: Number, default: 0 },
    color: { type: String, default: "#6366f1" },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

customerGroupSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
});

export default mongoose.models.CustomerGroup || mongoose.model("CustomerGroup", customerGroupSchema);

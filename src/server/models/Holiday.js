import "server-only";
import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ["public", "religious", "national", "company", "poya"],
      default: "public",
    },
    description: String,
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });

holidaySchema.pre(/^find/, function () {
  if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
});

export default mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);

import "server-only";
import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
  {
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, unique: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    branchName: { type: String, trim: true },
    swiftCode: { type: String, trim: true },
    category: {
      type: String,
      enum: ["received", "payment", "saving"],
      required: true,
    },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, default: "LKR" },
    isActive: { type: Boolean, default: true },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

bankAccountSchema.pre(/^find/, function (next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  if (typeof next === "function") next();
});

export default mongoose.models.BankAccount ||
  mongoose.model("BankAccount", bankAccountSchema);

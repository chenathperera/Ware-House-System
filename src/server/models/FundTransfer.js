import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const fundTransferSchema = new mongoose.Schema(
  {
    transferNumber: { type: String, unique: true, trim: true, uppercase: true },
    transferDate: { type: Date, default: Date.now },
    fromBankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
    },
    toBankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: "LKR" },
    reference: String,
    notes: String,
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

fundTransferSchema.pre("save", async function generateTransferNumber() {
  if (this.isNew && !this.transferNumber) {
    const sequence = await getNextSequence("fund_transfer");
    this.transferNumber = `TRF-${sequence}`;
  }
});

fundTransferSchema.pre(/^find/, function excludeDeleted(next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  if (typeof next === "function") next();
});

const FundTransfer =
  mongoose.models.FundTransfer ||
  mongoose.model("FundTransfer", fundTransferSchema);

export default FundTransfer;

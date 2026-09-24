import "server-only";
import mongoose from "mongoose";

const posSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    openedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    openingBalance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    cashSales: {
      type: Number,
      default: 0,
    },
    cashExpenses: {
      type: Number,
      default: 0,
    },
    expectedClosingBalance: {
      type: Number,
      default: 0,
    },
    actualClosingBalance: {
      type: Number,
      default: 0,
    },
    difference: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

posSessionSchema.index({ userId: 1, status: 1 });
posSessionSchema.index({ openedAt: -1 });

posSessionSchema.pre("save", function () {
  this.expectedClosingBalance =
    (this.openingBalance || 0) +
    (this.cashSales || 0) -
    (this.cashExpenses || 0);

  if (this.status === "closed") {
    this.difference =
      (this.actualClosingBalance || 0) - this.expectedClosingBalance;

    if (!this.closedAt) {
      this.closedAt = new Date();
    }
  }
});

export default mongoose.models.PosSession ||
  mongoose.model("PosSession", posSessionSchema);

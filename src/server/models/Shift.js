import "server-only";
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, trim: true, uppercase: true },
  startTime: { type: String, required: true }, endTime: { type: String, required: true },
  breakMinutes: { type: Number, default: 60 }, workingMinutes: Number,
  graceMinutes: { type: Number, default: 15 }, isOvernight: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.pre("save", function () { if (this.startTime && this.endTime) { const [sh, sm] = this.startTime.split(":").map(Number); const [eh, em] = this.endTime.split(":").map(Number); let diff = (eh * 60 + em) - (sh * 60 + sm); if (diff < 0) diff += 24 * 60; this.workingMinutes = Math.max(0, diff - (this.breakMinutes || 0)); } });
schema.pre(/^find/, function () { if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null }); });
export default mongoose.models.Shift || mongoose.model("Shift", schema);

import "server-only";
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 20 },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: String,
  parentDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ isActive: 1 });
schema.pre(/^find/, function () { if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null }); });
export default mongoose.models.Department || mongoose.model("Department", schema);

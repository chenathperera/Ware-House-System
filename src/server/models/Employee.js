import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const address = { line1: String, line2: String, city: String, state: String, postalCode: String, country: { type: String, default: "Sri Lanka" } };
const schema = new mongoose.Schema({
  employeeCode: { type: String, unique: true, trim: true, uppercase: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  firstName: { type: String, required: true, trim: true, maxlength: 50 }, lastName: { type: String, required: true, trim: true, maxlength: 50 }, displayName: { type: String, trim: true }, fullName: String,
  gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] }, dateOfBirth: Date, nationalIdNumber: { type: String, trim: true }, maritalStatus: { type: String, enum: ["single", "married", "divorced", "widowed", "separated"] }, nationality: { type: String, default: "Sri Lankan" }, religion: String, bloodGroup: String,
  email: { type: String, lowercase: true, trim: true }, phone: String, mobile: String, permanentAddress: address, currentAddress: address,
  emergencyContact: { name: String, relationship: String, phone: String, mobile: String, address: String },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" }, designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation" }, reportsToId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  employmentType: { type: String, enum: ["permanent", "contract", "probation", "intern", "part_time", "consultant"], default: "permanent" }, dateOfJoining: { type: Date, required: true }, probationEndDate: Date, confirmationDate: Date, contractEndDate: Date,
  workLocation: { type: String, trim: true }, workShift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" }, epfNumber: String, etfNumber: String, taxRegistrationNumber: String,
  bankDetails: { bankName: String, branchName: String, accountNumber: String, accountName: String }, salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructure" }, basicSalary: { type: Number, default: 0 }, commissionRate: { type: Number, default: 0 }, currency: { type: String, default: "LKR" },
  leaveBalances: { annual: { type: Number, default: 14 }, sick: { type: Number, default: 7 }, casual: { type: Number, default: 7 }, maternity: { type: Number, default: 84 }, paternity: { type: Number, default: 3 }, unpaid: { type: Number, default: 0 } },
  skills: [String], qualifications: [{ degree: String, institution: String, yearOfCompletion: Number, grade: String }], documents: [{ type: { type: String }, title: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  status: { type: String, enum: ["active", "on_leave", "probation", "suspended", "terminated", "resigned", "retired"], default: "active" }, dateOfExit: Date, exitReason: String, photoUrl: String, notes: String, internalNotes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ firstName: "text", lastName: "text", email: "text" }); schema.index({ departmentId: 1, status: 1 }); schema.index({ designationId: 1 }); schema.index({ userId: 1 }); schema.index({ nationalIdNumber: 1 }); schema.index({ status: 1 });
schema.pre("save", async function () { if (this.isNew && !this.employeeCode) this.employeeCode = `EMP-${await getNextSequence("employee")}`; this.fullName = `${this.firstName || ""} ${this.lastName || ""}`.trim(); if (!this.displayName) this.displayName = this.fullName; });
schema.pre(/^find/, function () { if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null }); });
export default mongoose.models.Employee || mongoose.model("Employee", schema);

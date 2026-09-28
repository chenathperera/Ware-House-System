import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const payslipSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  employeeCode: String,
  employeeName: String,
  workingDays: { type: Number, default: 0 },
  daysPresent: { type: Number, default: 0 },
  daysAbsent: { type: Number, default: 0 },
  leaveDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  basicSalary: { type: Number, default: 0 },
  earnings: [{ name: String, amount: Number, type: { type: String } }],
  grossEarnings: { type: Number, default: 0 },
  deductions: [{ name: String, amount: Number, type: { type: String } }],
  totalDeductions: { type: Number, default: 0 },
  epfEmployeeContribution: { type: Number, default: 0 },
  epfEmployerContribution: { type: Number, default: 0 },
  etfContribution: { type: Number, default: 0 },
  apitAmount: { type: Number, default: 0 },
  advanceDeducted: { type: Number, default: 0 },
  loanDeducted: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ["pending", "processing", "paid", "failed", "on_hold"], default: "pending" },
  paidAt: Date,
  paymentReference: String,
  notes: String,
}, { _id: true });

const schema = new mongoose.Schema({
  payrollNumber: { type: String, unique: true, trim: true, uppercase: true },
  periodMonth: { type: Number, required: true, min: 1, max: 12 },
  periodYear: { type: Number, required: true },
  periodStartDate: Date,
  periodEndDate: Date,
  payslips: [payslipSchema],
  totalEmployees: { type: Number, default: 0 },
  totalGrossEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  totalEpfEmployee: { type: Number, default: 0 },
  totalEpfEmployer: { type: Number, default: 0 },
  totalEtf: { type: Number, default: 0 },
  totalApit: { type: Number, default: 0 },
  totalNetPay: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "processed", "approved", "paid", "closed"], default: "draft" },
  processedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  paidAt: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ periodYear: -1, periodMonth: -1 });
schema.index({ status: 1 });
schema.index({ periodYear: 1, periodMonth: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
schema.pre("save", async function () {
  if (this.isNew && !this.payrollNumber) this.payrollNumber = `PAY-${this.periodYear}${String(this.periodMonth).padStart(2, "0")}-${await getNextSequence("payroll")}`;
  this.totalEmployees = this.payslips.length;
  const total = (field) => +this.payslips.reduce((sum, payslip) => sum + (payslip[field] || 0), 0).toFixed(2);
  this.totalGrossEarnings = total("grossEarnings");
  this.totalDeductions = total("totalDeductions");
  this.totalEpfEmployee = total("epfEmployeeContribution");
  this.totalEpfEmployer = total("epfEmployerContribution");
  this.totalEtf = total("etfContribution");
  this.totalApit = total("apitAmount");
  this.totalNetPay = total("netPay");
});
schema.pre(/^find/, function (next) { if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null }); if (typeof next === "function") next(); });

export default mongoose.models.Payroll || mongoose.model("Payroll", schema);

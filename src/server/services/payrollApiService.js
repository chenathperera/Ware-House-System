import "server-only";
import Payroll from "../models/Payroll.js";
import Employee from "../models/Employee.js";
import "../models/Department.js";
import "../models/Designation.js";
import Attendance from "../models/Attendance.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Holiday from "../models/Holiday.js";
import SalesOrder from "../models/SalesOrder.js";
import Expense from "../models/Expense.js";
import { calculatePayslip } from "./payrollCalculator.js";

const fail = (res, status, message) => { res.status(status); throw new Error(message); };
const monthBounds = (year, month) => ({ start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) });

async function getCommission(userId, year, month, rate = 0) {
  if (!userId || rate <= 0) return 0;
  const { start, end } = monthBounds(year, month);
  const orders = await SalesOrder.find({ salesRepId: userId, status: { $in: ["invoiced", "completed"] }, orderDate: { $gte: start, $lte: end } });
  return +(orders.reduce((sum, order) => sum + (order.grandTotal || 0), 0) * (rate / 100)).toFixed(2);
}

async function countWorkingDays(year, month) {
  const { start, end } = monthBounds(year, month);
  const holidays = await Holiday.find({ date: { $gte: start, $lte: end }, type: { $in: ["public", "national", "poya", "religious"] } }).select("date");
  const dates = new Set(holidays.map((holiday) => new Date(holiday.date).toDateString()));
  let count = 0;
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) if (date.getDay() !== 0 && !dates.has(date.toDateString())) count += 1;
  return count;
}

async function attendanceForMonth(employeeId, year, month) {
  const { start, end } = monthBounds(year, month);
  const records = await Attendance.find({ employeeId, date: { $gte: start, $lte: end } });
  let daysPresent = 0; let daysAbsent = 0; let halfDays = 0; let overtimeMinutes = 0;
  records.forEach((record) => { if (["present", "late"].includes(record.status)) daysPresent += 1; else if (record.status === "half_day") halfDays += 1; else if (record.status === "absent") daysAbsent += 1; overtimeMinutes += record.overtimeMinutes || 0; });
  const leaves = await LeaveRequest.find({ employeeId, status: "approved", fromDate: { $lte: end }, toDate: { $gte: start } });
  let leaveDays = 0; let unpaidLeaveDays = 0;
  leaves.forEach((leave) => { const from = new Date(Math.max(leave.fromDate, start)); const to = new Date(Math.min(leave.toDate, end)); const overlap = Math.max(0, Math.floor((to - from) / 86400000) + 1); const days = leave.isHalfDay ? Math.min(0.5, overlap) : overlap; leaveDays += days; if (leave.leaveType === "unpaid") unpaidLeaveDays += days; });
  return { daysPresent: daysPresent + (halfDays * 0.5), daysAbsent, leaveDays, unpaidLeaveDays, overtimeHours: +(overtimeMinutes / 60).toFixed(2) };
}

function structureEarnings(employee, commission, rich = true) {
  const earnings = [];
  employee.salaryStructureId?.components?.filter((component) => component.type === "earning").forEach((component) => {
    const amount = component.calculationType === "fixed" ? component.amount || 0 : component.calculationType === "percentage_of_basic" ? (employee.basicSalary * (component.percentage || 0)) / 100 : 0;
    earnings.push(rich ? { name: component.name, amount, type: "allowance", isTaxable: component.isTaxable !== false, isEpfable: true } : { name: component.name, amount });
  });
  if (commission > 0) earnings.push(rich ? { name: "Sales Commission", amount: commission, type: "bonus", isTaxable: true, isEpfable: false } : { name: "Sales Commission", amount: commission });
  return earnings;
}

export async function processPayroll(req, res) {
  const { periodMonth, periodYear, includeEmployeeIds, overtimeRatePerHour = 0 } = req.body;
  if (!periodMonth || !periodYear) fail(res, 400, "periodMonth and periodYear are required");
  const existing = await Payroll.findOne({ periodMonth, periodYear, deletedAt: null });
  if (existing && existing.status !== "draft") fail(res, 400, `Payroll for ${periodMonth}/${periodYear} already ${existing.status}`);
  if (existing) await Payroll.deleteOne({ _id: existing._id });
  const filter = { status: { $in: ["active", "on_leave", "probation"] } }; if (includeEmployeeIds?.length) filter._id = { $in: includeEmployeeIds };
  const employees = await Employee.find(filter).populate("salaryStructureId");
  if (!employees.length) fail(res, 400, "No active employees found for payroll");
  const workingDays = await countWorkingDays(periodYear, periodMonth); const payslips = [];
  for (const employee of employees) {
    if (!employee.basicSalary || employee.basicSalary <= 0) continue;
    const [attendance, commission] = await Promise.all([attendanceForMonth(employee._id, periodYear, periodMonth), getCommission(employee.userId, periodYear, periodMonth, employee.commissionRate || 0)]);
    const calculation = calculatePayslip({ basicSalary: employee.basicSalary, earnings: structureEarnings(employee, commission), otherDeductions: [], attendance: { workingDays, daysPresent: attendance.daysPresent, unpaidLeaveDays: attendance.unpaidLeaveDays, overtimeHours: attendance.overtimeHours }, overtimeRate: overtimeRatePerHour });
    payslips.push({ employeeId: employee._id, employeeCode: employee.employeeCode, employeeName: employee.fullName, workingDays, daysPresent: attendance.daysPresent, daysAbsent: attendance.daysAbsent, leaveDays: attendance.leaveDays, unpaidLeaveDays: attendance.unpaidLeaveDays, overtimeHours: attendance.overtimeHours, basicSalary: employee.basicSalary, earnings: calculation.earnings, grossEarnings: calculation.grossEarnings, deductions: calculation.deductions, totalDeductions: calculation.totalDeductions, epfEmployeeContribution: calculation.epfEmployeeContribution, epfEmployerContribution: calculation.epfEmployerContribution, etfContribution: calculation.etfContribution, apitAmount: calculation.apitAmount, netPay: calculation.netPay, paymentStatus: "pending" });
  }
  const payroll = new Payroll({ periodMonth, periodYear, periodStartDate: new Date(periodYear, periodMonth - 1, 1), periodEndDate: new Date(periodYear, periodMonth, 0), payslips, status: "processed", processedAt: new Date(), processedBy: req.user._id, createdBy: req.user._id });
  await payroll.save(); res.status(201).json({ success: true, data: payroll });
}
export async function getPayrolls(req, res) { const { year, status, page = 1, limit = 12 } = req.query; const filter = {}; if (year) filter.periodYear = Number(year); if (status) filter.status = status; const skip = (Number(page) - 1) * Number(limit); const [list, total] = await Promise.all([Payroll.find(filter).select("-payslips").sort({ periodYear: -1, periodMonth: -1 }).skip(skip).limit(Number(limit)), Payroll.countDocuments(filter)]); res.json({ success: true, count: list.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: list }); }
export async function getPayrollById(req, res) { const data = await Payroll.findById(req.params.id).populate("processedBy", "firstName lastName").populate("approvedBy", "firstName lastName"); if (!data) fail(res, 404, "Payroll not found"); res.json({ success: true, data }); }
export async function approvePayroll(req, res) { const payroll = await Payroll.findById(req.params.id); if (!payroll) fail(res, 404, "Payroll not found"); if (payroll.status !== "processed") fail(res, 400, `Cannot approve payroll with status '${payroll.status}'`); payroll.status = "approved"; payroll.approvedBy = req.user._id; payroll.approvedAt = new Date(); await payroll.save(); res.json({ success: true, data: payroll }); }
export async function markPayrollPaid(req, res) { const payroll = await Payroll.findById(req.params.id); if (!payroll) fail(res, 404, "Payroll not found"); if (payroll.status !== "approved") fail(res, 400, "Payroll must be approved before marking paid"); payroll.status = "paid"; payroll.paidAt = new Date(); payroll.payslips.forEach((payslip) => { payslip.paymentStatus = "paid"; payslip.paidAt = new Date(); }); await payroll.save(); try { const amount = payroll.payslips.reduce((sum, payslip) => sum + (payslip.netPay || 0), 0); if (amount > 0) await Expense.create({ date: payroll.paidAt || new Date(), category: "Salary", amount: +amount.toFixed(2), paymentMethod: "bank_transfer", reference: payroll.payrollNumber, description: `Payroll ${payroll.payrollNumber} — ${payroll.periodMonth}/${payroll.periodYear} (${payroll.payslips.length} employees)`, status: "paid", createdBy: req.user._id }); } catch (error) { console.warn("Could not auto-create salary expense:", error.message); } res.json({ success: true, data: payroll }); }
export async function getEmployeePayslip(req, res) { const payroll = await Payroll.findById(req.params.id); if (!payroll) fail(res, 404, "Payroll not found"); const payslip = payroll.payslips.find((item) => item.employeeId.toString() === req.params.employeeId); if (!payslip) fail(res, 404, "Payslip not found for this employee"); const employee = await Employee.findById(req.params.employeeId).populate("departmentId designationId"); res.json({ success: true, data: { payslip, payroll: { payrollNumber: payroll.payrollNumber, periodMonth: payroll.periodMonth, periodYear: payroll.periodYear, periodStartDate: payroll.periodStartDate, periodEndDate: payroll.periodEndDate }, employee: { firstName: employee?.firstName, lastName: employee?.lastName, employeeCode: employee?.employeeCode, department: employee?.departmentId?.name, designation: employee?.designationId?.name, epfNumber: employee?.epfNumber, bankDetails: employee?.bankDetails } } }); }
export async function previewPayslip(req, res) { const { employeeId, periodMonth, periodYear, overtimeRatePerHour = 0 } = req.body; const employee = await Employee.findById(employeeId).populate("salaryStructureId"); if (!employee) fail(res, 404, "Employee not found"); const workingDays = await countWorkingDays(periodYear, periodMonth); const [attendance, commission] = await Promise.all([attendanceForMonth(employee._id, periodYear, periodMonth), getCommission(employee.userId, periodYear, periodMonth, employee.commissionRate || 0)]); const calculation = calculatePayslip({ basicSalary: employee.basicSalary, earnings: structureEarnings(employee, commission, false), attendance: { workingDays, daysPresent: attendance.daysPresent, unpaidLeaveDays: attendance.unpaidLeaveDays, overtimeHours: attendance.overtimeHours }, overtimeRate: overtimeRatePerHour }); res.json({ success: true, data: { employee, workingDays, attendance, calculation } }); }

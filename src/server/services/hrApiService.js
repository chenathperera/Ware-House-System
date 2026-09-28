import "server-only";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import Shift from "../models/Shift.js";
import Attendance from "../models/Attendance.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Holiday from "../models/Holiday.js";
import SalaryStructure from "../models/SalaryStructure.js";

const notFound = (res, message) => { res.status(404); throw new Error(message); };

export async function createDepartment(req, res) { const department = await Department.create(req.body); res.status(201).json({ success: true, data: department }); }
export async function getDepartments(req, res) { const filter = {}; if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true"; const data = await Department.find(filter).populate("managerId", "firstName lastName employeeCode").populate("parentDepartmentId", "name code").sort({ name: 1 }); res.json({ success: true, count: data.length, data }); }
export async function updateDepartment(req, res) { const data = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!data) notFound(res, "Department not found"); res.json({ success: true, data }); }
export async function deleteDepartment(req, res) { const data = await Department.findById(req.params.id); if (!data) notFound(res, "Department not found"); data.deletedAt = new Date(); data.isActive = false; await data.save(); res.json({ success: true }); }

export async function createDesignation(req, res) { const designation = await Designation.create(req.body); res.status(201).json({ success: true, data: designation }); }
export async function getDesignations(req, res) { const filter = {}; if (req.query.departmentId) filter.departmentId = req.query.departmentId; if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true"; const data = await Designation.find(filter).populate("departmentId", "name code").sort({ level: 1, name: 1 }); res.json({ success: true, count: data.length, data }); }
export async function updateDesignation(req, res) { const data = await Designation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!data) notFound(res, "Designation not found"); res.json({ success: true, data }); }
export async function deleteDesignation(req, res) { const data = await Designation.findById(req.params.id); if (!data) notFound(res, "Designation not found"); data.deletedAt = new Date(); data.isActive = false; await data.save(); res.json({ success: true }); }

export async function createEmployee(req, res) { const employee = new Employee({ ...req.body, createdBy: req.user._id }); await employee.save(); const data = await Employee.findById(employee._id).populate("departmentId", "name code").populate("designationId", "name code").populate("reportsToId", "firstName lastName employeeCode"); res.status(201).json({ success: true, data }); }
export async function getEmployees(req, res) { const { search, departmentId, designationId, status, employmentType, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query; const filter = {}; if (search) filter.$or = ["firstName", "lastName", "employeeCode", "email", "phone"].map((field) => ({ [field]: { $regex: search, $options: "i" } })); if (departmentId) filter.departmentId = departmentId; if (designationId) filter.designationId = designationId; if (status) filter.status = status; if (employmentType) filter.employmentType = employmentType; const skip = (Number(page) - 1) * Number(limit); const [data, total] = await Promise.all([Employee.find(filter).populate("departmentId", "name code").populate("designationId", "name code").populate("reportsToId", "firstName lastName employeeCode").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(Number(limit)), Employee.countDocuments(filter)]); res.json({ success: true, count: data.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data }); }
export async function getEmployeeById(req, res) { const data = await Employee.findById(req.params.id).populate("departmentId", "name code").populate("designationId", "name code").populate("reportsToId", "firstName lastName employeeCode").populate("userId", "email role isActive").populate("workShift", "name startTime endTime").populate("salaryStructureId", "name code components"); if (!data) notFound(res, "Employee not found"); res.json({ success: true, data }); }
export async function updateEmployee(req, res) { const data = await Employee.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true, runValidators: true }); if (!data) notFound(res, "Employee not found"); res.json({ success: true, data }); }
export async function deleteEmployee(req, res) { const data = await Employee.findById(req.params.id); if (!data) notFound(res, "Employee not found"); data.deletedAt = new Date(); data.status = "terminated"; await data.save(); res.json({ success: true }); }

export async function createShift(req, res) { const shift = await Shift.create(req.body); res.status(201).json({ success: true, data: shift }); }
export async function getShifts(req, res) { const data = await Shift.find().sort({ startTime: 1 }); res.json({ success: true, count: data.length, data }); }
export async function updateShift(req, res) { const data = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!data) notFound(res, "Shift not found"); res.json({ success: true, data }); }
export async function deleteShift(req, res) { const data = await Shift.findById(req.params.id); if (!data) notFound(res, "Shift not found"); data.deletedAt = new Date(); data.isActive = false; await data.save(); res.json({ success: true }); }

export async function markAttendance(req, res) {
  const { employeeId, date, checkInTime, checkOutTime, status, shiftId, notes, lateMinutes, overtimeMinutes } = req.body;
  const employee = await Employee.findById(employeeId);
  if (!employee) notFound(res, "Employee not found");
  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);
  let data = await Attendance.findOne({ employeeId, date: attendanceDate });
  if (data) {
    if (checkInTime !== undefined) data.checkInTime = checkInTime;
    if (checkOutTime !== undefined) data.checkOutTime = checkOutTime;
    if (status) data.status = status;
    if (shiftId) data.shiftId = shiftId;
    if (notes !== undefined) data.notes = notes;
    if (lateMinutes !== undefined) data.lateMinutes = lateMinutes;
    if (overtimeMinutes !== undefined) data.overtimeMinutes = overtimeMinutes;
  } else {
    data = new Attendance({ employeeId: employee._id, employeeCode: employee.employeeCode, employeeName: employee.fullName, date: attendanceDate, checkInTime, checkOutTime, status: status || "present", shiftId, lateMinutes: lateMinutes || 0, overtimeMinutes: overtimeMinutes || 0, notes, markedBy: req.user._id });
  }
  if (data.checkInTime && data.checkOutTime) data.totalWorkedMinutes = Math.max(0, Math.floor((new Date(data.checkOutTime) - new Date(data.checkInTime)) / 60000));
  await data.save();
  res.status(201).json({ success: true, data });
}

export async function getAttendance(req, res) {
  const { employeeId, departmentId, status, startDate, endDate, date, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (status) filter.status = status;
  if (date) { const start = new Date(date); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); filter.date = { $gte: start, $lt: end }; }
  else if (startDate || endDate) { filter.date = {}; if (startDate) filter.date.$gte = new Date(startDate); if (endDate) filter.date.$lte = new Date(endDate); }
  if (departmentId) filter.employeeId = { $in: await Employee.find({ departmentId }).distinct("_id") };
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([Attendance.find(filter).populate("employeeId", "firstName lastName employeeCode departmentId").populate("shiftId", "name startTime endTime").sort({ date: -1 }).skip(skip).limit(Number(limit)), Attendance.countDocuments(filter)]);
  res.json({ success: true, count: data.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data });
}

export async function bulkMarkAttendance(req, res) {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) { res.status(400); throw new Error("date and records array required"); }
  const attendanceDate = new Date(date); attendanceDate.setHours(0, 0, 0, 0);
  const data = [];
  for (const record of records) {
    if (!record.employeeId) continue;
    const employee = await Employee.findById(record.employeeId);
    if (!employee) continue;
    let attendance = await Attendance.findOne({ employeeId: record.employeeId, date: attendanceDate });
    if (!attendance) attendance = new Attendance({ employeeId: employee._id, employeeCode: employee.employeeCode, employeeName: employee.fullName, date: attendanceDate, markedBy: req.user._id });
    attendance.status = record.status || "present"; attendance.checkInTime = record.checkInTime; attendance.checkOutTime = record.checkOutTime; attendance.lateMinutes = record.lateMinutes || 0; attendance.overtimeMinutes = record.overtimeMinutes || 0; attendance.notes = record.notes;
    if (attendance.checkInTime && attendance.checkOutTime) attendance.totalWorkedMinutes = Math.max(0, Math.floor((new Date(attendance.checkOutTime) - new Date(attendance.checkInTime)) / 60000));
    await attendance.save(); data.push(attendance);
  }
  res.json({ success: true, count: data.length, data });
}

export async function createLeaveRequest(req, res) {
  const { employeeId, leaveType, fromDate, toDate, ...rest } = req.body;
  const employee = await Employee.findById(employeeId); if (!employee) notFound(res, "Employee not found");
  const from = new Date(fromDate); const to = new Date(toDate); const numberOfDays = rest.isHalfDay ? 0.5 : Math.floor((to - from) / 86400000) + 1;
  const balance = employee.leaveBalances?.[leaveType] || 0;
  const data = new LeaveRequest({ employeeId: employee._id, employeeCode: employee.employeeCode, employeeName: employee.fullName, leaveType, fromDate: from, toDate: to, numberOfDays, ...rest, createdBy: req.user._id });
  await data.save(); res.status(201).json({ success: true, data, warning: numberOfDays > balance ? `Requested ${numberOfDays} days exceeds balance of ${balance}` : undefined });
}

export async function getLeaveRequests(req, res) {
  const { employeeId, status, leaveType, startDate, endDate, page = 1, limit = 20 } = req.query; const filter = {};
  if (employeeId) filter.employeeId = employeeId; if (status) filter.status = status; if (leaveType) filter.leaveType = leaveType;
  if (startDate || endDate) { filter.fromDate = {}; if (startDate) filter.fromDate.$gte = new Date(startDate); if (endDate) filter.fromDate.$lte = new Date(endDate); }
  const skip = (Number(page) - 1) * Number(limit); const [data, total] = await Promise.all([LeaveRequest.find(filter).populate("employeeId", "firstName lastName employeeCode departmentId leaveBalances").populate("approvedBy", "firstName lastName").sort({ fromDate: -1 }).skip(skip).limit(Number(limit)), LeaveRequest.countDocuments(filter)]);
  res.json({ success: true, count: data.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data });
}

export async function approveLeaveRequest(req, res) { const data = await LeaveRequest.findById(req.params.id); if (!data) notFound(res, "Leave not found"); if (data.status !== "pending") { res.status(400); throw new Error(`Cannot approve leave with status '${data.status}'`); } data.status = "approved"; data.approvedBy = req.user._id; data.approvedAt = new Date(); await data.save(); const employee = await Employee.findById(data.employeeId); if (employee) { employee.leaveBalances = employee.leaveBalances || {}; employee.leaveBalances[data.leaveType] = Math.max(0, (employee.leaveBalances[data.leaveType] || 0) - data.numberOfDays); await employee.save(); } res.json({ success: true, data }); }
export async function rejectLeaveRequest(req, res) { const data = await LeaveRequest.findById(req.params.id); if (!data) notFound(res, "Leave not found"); if (data.status !== "pending") { res.status(400); throw new Error(`Cannot reject leave with status '${data.status}'`); } data.status = "rejected"; data.rejectedBy = req.user._id; data.rejectedAt = new Date(); data.rejectionReason = req.body.reason; await data.save(); res.json({ success: true, data }); }
export async function cancelLeaveRequest(req, res) { const data = await LeaveRequest.findById(req.params.id); if (!data) notFound(res, "Leave not found"); const wasApproved = data.status === "approved"; data.status = "cancelled"; await data.save(); if (wasApproved) { const employee = await Employee.findById(data.employeeId); if (employee) { employee.leaveBalances = employee.leaveBalances || {}; employee.leaveBalances[data.leaveType] = (employee.leaveBalances[data.leaveType] || 0) + data.numberOfDays; await employee.save(); } } res.json({ success: true, data }); }

export async function createHoliday(req, res) { const data = await Holiday.create(req.body); res.status(201).json({ success: true, data }); }
export async function getHolidays(req, res) { const filter = {}; if (req.query.year) filter.date = { $gte: new Date(`${req.query.year}-01-01`), $lte: new Date(`${req.query.year}-12-31`) }; if (req.query.type) filter.type = req.query.type; const data = await Holiday.find(filter).sort({ date: 1 }); res.json({ success: true, count: data.length, data }); }
export async function updateHoliday(req, res) { const data = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!data) notFound(res, "Holiday not found"); res.json({ success: true, data }); }
export async function deleteHoliday(req, res) { const data = await Holiday.findById(req.params.id); if (!data) notFound(res, "Holiday not found"); data.deletedAt = new Date(); data.isActive = false; await data.save(); res.json({ success: true }); }

export async function createSalaryStructure(req, res) { const data = await SalaryStructure.create(req.body); res.status(201).json({ success: true, data }); }
export async function getSalaryStructures(req, res) { const filter = {}; if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true"; const data = await SalaryStructure.find(filter).sort({ name: 1 }); res.json({ success: true, count: data.length, data }); }
export async function updateSalaryStructure(req, res) { const data = await SalaryStructure.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!data) notFound(res, "Salary structure not found"); res.json({ success: true, data }); }
export async function deleteSalaryStructure(req, res) { const data = await SalaryStructure.findById(req.params.id); if (!data) notFound(res, "Salary structure not found"); data.deletedAt = new Date(); data.isActive = false; await data.save(); res.json({ success: true }); }

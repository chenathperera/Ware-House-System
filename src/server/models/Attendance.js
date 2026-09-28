import "server-only";
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  employeeCode: String,
  employeeName: String,
  date: { type: Date, required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" },
  checkInTime: Date,
  checkOutTime: Date,
  totalWorkedMinutes: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  earlyLeaveMinutes: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["present", "absent", "half_day", "leave", "holiday", "weekend", "late"],
    default: "present",
  },
  leaveId: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveRequest" },
  leaveType: String,
  checkInMethod: { type: String, enum: ["manual", "biometric", "mobile", "web"], default: "manual" },
  location: { latitude: Number, longitude: Number, address: String },
  notes: String,
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

schema.index({ employeeId: 1, date: 1 }, { unique: true });
schema.index({ date: 1, status: 1 });

export default mongoose.models.Attendance || mongoose.model("Attendance", schema);

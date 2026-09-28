import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import Attendance from "../src/server/models/Attendance.js";
import Counter from "../src/server/models/Counter.js";
import Employee from "../src/server/models/Employee.js";
import Holiday from "../src/server/models/Holiday.js";
import LeaveRequest from "../src/server/models/LeaveRequest.js";
import SalaryStructure from "../src/server/models/SalaryStructure.js";
import User from "../src/server/models/User.js";
import { GET as attendance, POST as markAttendance } from "../src/app/api/attendance/route.js";
import { POST as bulkAttendance } from "../src/app/api/attendance/bulk/route.js";
import { GET as holidays, POST as createHoliday } from "../src/app/api/holidays/route.js";
import { DELETE as deleteHoliday, PUT as updateHoliday } from "../src/app/api/holidays/[id]/route.js";
import { GET as leaves, POST as createLeave } from "../src/app/api/leaves/route.js";
import { PATCH as approveLeave } from "../src/app/api/leaves/[id]/approve/route.js";
import { PATCH as cancelLeave } from "../src/app/api/leaves/[id]/cancel/route.js";
import { PATCH as rejectLeave } from "../src/app/api/leaves/[id]/reject/route.js";
import { GET as salaryStructures, POST as createSalaryStructure } from "../src/app/api/salary-structures/route.js";
import { DELETE as deleteSalaryStructure, PUT as updateSalaryStructure } from "../src/app/api/salary-structures/[id]/route.js";

const uri = "mongodb://127.0.0.1:27018/warehouse_system_hr_ops_test?replicaSet=stockTestRs";
const models = [Attendance, LeaveRequest, SalaryStructure, Holiday, Employee, User, Counter];
const request = (method, path, user, body) => new Request(`http://hr-ops.test${path}`, { method, headers: { ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
async function call(handler, path, { method = "GET", user, body, id } = {}) { const response = await handler(request(method, path, user, body), { params: Promise.resolve(id ? { id } : {}) }); return { status: response.status, body: await response.json() }; }
function ok(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body; }

test("HR Ops API preserves Attendance, Leave, Holiday and Salary Structure contracts", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved isolated database");
  await mongoose.connect(uri);
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.equal(hello.isWritablePrimary, true, "Refusing a non-primary test replica set");
  t.after(async () => { for (const model of models) await model.collection.deleteMany({}); await mongoose.disconnect(); });
  for (const model of models) await model.collection.deleteMany({});
  const admin = await User.create({ firstName: "HR", lastName: "Admin", email: "hr-ops-admin@example.invalid", password: "Password9!", role: "admin" });
  const employee = await Employee.create({ firstName: "Asha", lastName: "Perera", dateOfJoining: "2026-01-01", leaveBalances: { annual: 2, compensatory: 0 } });

  await t.test("Attendance creates, updates, bulk-marks, filters and validates", async () => {
    ok(await call(attendance, "/api/attendance"), 401);
    const created = ok(await call(markAttendance, "/api/attendance", { method: "POST", user: admin, body: { employeeId: employee._id, date: "2031-04-01", status: "present", checkInTime: "2031-04-01T01:00:00.000Z", checkOutTime: "2031-04-01T09:00:00.000Z", lateMinutes: 5 } }), 201).data;
    assert.equal(created.totalWorkedMinutes, 480);
    assert.equal(ok(await call(markAttendance, "/api/attendance", { method: "POST", user: admin, body: { employeeId: employee._id, date: "2031-04-01", status: "late" } }), 201).data.status, "late");
    ok(await call(bulkAttendance, "/api/attendance/bulk", { method: "POST", user: admin, body: { date: "2031-04-02", records: [{ employeeId: employee._id, status: "half_day" }] } }), 200);
    ok(await call(bulkAttendance, "/api/attendance/bulk", { method: "POST", user: admin, body: { records: [] } }), 400);
    assert.equal(ok(await call(attendance, "/api/attendance?status=late", { user: admin }), 200).total, 1);
  });

  await t.test("Leave supports compensatory creation, approval, rejection restrictions and cancellation effects", async () => {
    const compensatory = ok(await call(createLeave, "/api/leaves", { method: "POST", user: admin, body: { employeeId: employee._id, leaveType: "compensatory", fromDate: "2031-05-01", toDate: "2031-05-01", isHalfDay: true, reason: "Weekend support" } }), 201).data;
    assert.equal(compensatory.numberOfDays, 0.5);
    ok(await call(approveLeave, `/api/leaves/${compensatory._id}/approve`, { method: "PATCH", user: admin, id: compensatory._id }), 200);
    ok(await call(rejectLeave, `/api/leaves/${compensatory._id}/reject`, { method: "PATCH", user: admin, id: compensatory._id, body: { reason: "Already approved" } }), 400);
    ok(await call(cancelLeave, `/api/leaves/${compensatory._id}/cancel`, { method: "PATCH", user: admin, id: compensatory._id }), 200);
    const annual = ok(await call(createLeave, "/api/leaves", { method: "POST", user: admin, body: { employeeId: employee._id, leaveType: "annual", fromDate: "2031-06-01", toDate: "2031-06-02", reason: "Annual leave" } }), 201).data;
    ok(await call(approveLeave, `/api/leaves/${annual._id}/approve`, { method: "PATCH", user: admin, id: annual._id }), 200);
    assert.equal((await Employee.findById(employee._id)).leaveBalances.annual, 0);
    ok(await call(cancelLeave, `/api/leaves/${annual._id}/cancel`, { method: "PATCH", user: admin, id: annual._id }), 200);
    assert.equal((await Employee.findById(employee._id)).leaveBalances.annual, 2);
    assert.equal(ok(await call(leaves, "/api/leaves?leaveType=annual", { user: admin }), 200).total, 1);
  });

  await t.test("Holidays validate, filter by year, update and soft-delete", async () => {
    ok(await call(createHoliday, "/api/holidays", { method: "POST", user: admin, body: { date: "2031-01-01" } }), 400);
    const holiday = ok(await call(createHoliday, "/api/holidays", { method: "POST", user: admin, body: { name: "Test Poya", date: "2031-01-03", type: "poya" } }), 201).data;
    assert.equal(ok(await call(holidays, "/api/holidays?year=2031", { user: admin }), 200).data.length, 1);
    assert.equal(ok(await call(updateHoliday, `/api/holidays/${holiday._id}`, { method: "PUT", user: admin, id: holiday._id, body: { type: "company" } }), 200).data.type, "company");
    ok(await call(deleteHoliday, `/api/holidays/${holiday._id}`, { method: "DELETE", user: admin, id: holiday._id }), 200);
    assert.equal((await Holiday.collection.findOne({ _id: new mongoose.Types.ObjectId(holiday._id) })).isActive, false);
  });

  await t.test("Salary Structures remain template-oriented through create, list, update and soft-delete", async () => {
    ok(await call(createSalaryStructure, "/api/salary-structures", { method: "POST", user: admin, body: { code: "INVALID" } }), 400);
    const structure = ok(await call(createSalaryStructure, "/api/salary-structures", { method: "POST", user: admin, body: { name: "Standard", code: "std", components: [{ name: "Basic", type: "earning", calculationType: "fixed", amount: 100000, isTaxable: true }, { name: "EPF", type: "deduction", calculationType: "percentage_of_basic", percentage: 8, isTaxable: false }] } }), 201).data;
    assert.equal(structure.code, "STD"); assert.equal(structure.components.length, 2); assert.equal(structure.employeeId, undefined);
    assert.equal(ok(await call(salaryStructures, "/api/salary-structures", { user: admin }), 200).data.length, 1);
    assert.equal(ok(await call(updateSalaryStructure, `/api/salary-structures/${structure._id}`, { method: "PUT", user: admin, id: structure._id, body: { description: "Updated template" } }), 200).data.description, "Updated template");
    ok(await call(deleteSalaryStructure, `/api/salary-structures/${structure._id}`, { method: "DELETE", user: admin, id: structure._id }), 200);
    assert.equal((await SalaryStructure.collection.findOne({ _id: new mongoose.Types.ObjectId(structure._id) })).isActive, false);
  });
});

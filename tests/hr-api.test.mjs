import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import Department from "../src/server/models/Department.js";
import Designation from "../src/server/models/Designation.js";
import Employee from "../src/server/models/Employee.js";
import Shift from "../src/server/models/Shift.js";
import User from "../src/server/models/User.js";
import Counter from "../src/server/models/Counter.js";
import { GET as departments, POST as createDepartment } from "../src/app/api/departments/route.js";
import { PUT as updateDepartment, DELETE as deleteDepartment } from "../src/app/api/departments/[id]/route.js";
import { GET as designations, POST as createDesignation } from "../src/app/api/designations/route.js";
import { PUT as updateDesignation, DELETE as deleteDesignation } from "../src/app/api/designations/[id]/route.js";
import { GET as employees, POST as createEmployee } from "../src/app/api/employees/route.js";
import { GET as employeeById, PUT as updateEmployee, DELETE as deleteEmployee } from "../src/app/api/employees/[id]/route.js";
import { GET as shifts, POST as createShift } from "../src/app/api/shifts/route.js";
import { PUT as updateShift, DELETE as deleteShift } from "../src/app/api/shifts/[id]/route.js";

const uri = "mongodb://127.0.0.1:27018/warehouse_system_hr_test?replicaSet=stockTestRs";
const request = (method, path, user, body) => new Request(`http://hr.test${path}`, { method, headers: { ...(user ? { authorization: `Bearer ${generateToken(user._id)}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
async function call(handler, path, { method = "GET", user, body, id } = {}) { const response = await handler(request(method, path, user, body), { params: Promise.resolve(id ? { id } : {}) }); return { status: response.status, body: await response.json() }; }
function ok(result, status) { assert.equal(result.status, status, JSON.stringify(result.body)); return result.body; }

test("HR master API preserves original master contracts", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved isolated database");
  await mongoose.connect(uri);
  const models = [Department, Designation, Employee, Shift, User, Counter];
  t.after(async () => { for (const model of models) await model.collection.deleteMany({}); await mongoose.disconnect(); });
  for (const model of models) await model.collection.deleteMany({});
  const admin = await User.create({ firstName: "HR", lastName: "Admin", email: "hr-admin@example.invalid", password: "Password9!", role: "admin" });
  const staff = await User.create({ firstName: "HR", lastName: "Staff", email: "hr-staff@example.invalid", password: "Password9!", role: "staff" });
  await t.test("Department creates, lists, updates, validates and soft-deletes", async () => {
    ok(await call(departments, "/api/departments"), 401);
    const department = ok(await call(createDepartment, "/api/departments", { method: "POST", user: admin, body: { code: "HR", name: "Human Resources" } }), 201).data;
    assert.equal(department.code, "HR");
    ok(await call(createDepartment, "/api/departments", { method: "POST", user: staff, body: { code: "NO", name: "No" } }), 403);
    assert.equal(ok(await call(departments, "/api/departments?isActive=true", { user: admin }), 200).data.length, 1);
    assert.equal(ok(await call(updateDepartment, `/api/departments/${department._id}`, { method: "PUT", user: admin, id: department._id, body: { name: "People" } }), 200).data.name, "People");
    ok(await call(deleteDepartment, `/api/departments/${department._id}`, { method: "DELETE", user: admin, id: department._id }), 200);
    assert.equal(await Department.findById(department._id), null);
  });
  await t.test("Designation preserves department filtering and soft deletion", async () => {
    const department = await Department.create({ code: "OPS", name: "Operations" });
    const designation = ok(await call(createDesignation, "/api/designations", { method: "POST", user: admin, body: { code: "MGR", name: "Manager", departmentId: department._id, level: 2 } }), 201).data;
    const listed = ok(await call(designations, `/api/designations?departmentId=${department._id}`, { user: admin }), 200);
    assert.equal(listed.data[0].departmentId.name, "Operations");
    ok(await call(updateDesignation, `/api/designations/${designation._id}`, { method: "PUT", user: admin, id: designation._id, body: { level: 3 } }), 200);
    ok(await call(deleteDesignation, `/api/designations/${designation._id}`, { method: "DELETE", user: admin, id: designation._id }), 200);
    assert.equal(await Designation.findById(designation._id), null);
  });
  await t.test("Employee numbers, populates references, searches, updates and terminates", async () => {
    const department = await Department.create({ code: "SALES", name: "Sales" }); const designation = await Designation.create({ code: "REP", name: "Representative", departmentId: department._id }); const shift = await Shift.create({ name: "Day", startTime: "08:00", endTime: "17:00" });
    const employee = ok(await call(createEmployee, "/api/employees", { method: "POST", user: admin, body: { firstName: "Alice", lastName: "Perera", dateOfJoining: "2026-01-01", departmentId: department._id, designationId: designation._id, workShift: shift._id } }), 201).data;
    assert.match(employee.employeeCode, /^EMP-\d+$/); assert.equal(employee.departmentId.name, "Sales");
    assert.equal(ok(await call(employees, "/api/employees?search=Alice&departmentId=" + department._id, { user: admin }), 200).total, 1);
    const detail = ok(await call(employeeById, `/api/employees/${employee._id}`, { user: admin, id: employee._id }), 200).data; assert.equal(detail.workShift.name, "Day");
    ok(await call(updateEmployee, `/api/employees/${employee._id}`, { method: "PUT", user: admin, id: employee._id, body: { status: "suspended" } }), 200);
    ok(await call(deleteEmployee, `/api/employees/${employee._id}`, { method: "DELETE", user: admin, id: employee._id }), 200);
    assert.equal(await Employee.findById(employee._id), null);
  });
  await t.test("Shift calculates creation minutes, sorts and soft-deletes", async () => {
    const shift = ok(await call(createShift, "/api/shifts", { method: "POST", user: admin, body: { name: "Night", code: "NGT", startTime: "22:00", endTime: "06:00", breakMinutes: 30 } }), 201).data;
    assert.equal(shift.workingMinutes, 450); assert.ok(ok(await call(shifts, "/api/shifts", { user: admin }), 200).data.length > 0);
    ok(await call(updateShift, `/api/shifts/${shift._id}`, { method: "PUT", user: admin, id: shift._id, body: { graceMinutes: 20 } }), 200);
    ok(await call(deleteShift, `/api/shifts/${shift._id}`, { method: "DELETE", user: admin, id: shift._id }), 200);
    assert.equal(await Shift.findById(shift._id), null);
  });
});

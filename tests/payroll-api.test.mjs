import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import generateToken from "../src/server/auth/token.js";
import Employee from "../src/server/models/Employee.js";
import Payroll from "../src/server/models/Payroll.js";
import User from "../src/server/models/User.js";
import { GET as getPayslip } from "../src/app/api/payroll/[id]/payslip/[employeeId]/route.js";
import { calculateAPIT, calculatePayslip } from "../src/server/services/payrollCalculator.js";

const uri = "mongodb://127.0.0.1:27018/warehouse_system_payroll_test?replicaSet=stockTestRs";

test("Payroll calculator preserves source statutory and unpaid-leave contracts", async () => {
  assert.equal(new URL(uri).port, "27018");
  assert.equal(new URL(uri).pathname, "/warehouse_system_payroll_test");
  const calculation = calculatePayslip({ basicSalary: 100000, earnings: [{ name: "Allowance", amount: 5000, isTaxable: true, isEpfable: true }], attendance: { workingDays: 20, unpaidLeaveDays: 2, overtimeHours: 3 }, overtimeRate: 200 });
  assert.equal(calculation.effectiveBasic, 90000);
  assert.equal(calculation.grossEarnings, 95600);
  assert.equal(calculation.epfEmployeeContribution, 7600);
  assert.equal(calculation.epfEmployerContribution, 11400);
  assert.equal(calculation.etfContribution, 2850);
  assert.equal(calculation.apitAmount, 0);
  assert.equal(calculation.netPay, 88000);
  assert.equal(calculateAPIT(233333), 4999.98);
  assert.equal(calculateAPIT(275000), 12500.06);
});

test("Payroll test database is the isolated primary replica set", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved isolated database");
  await mongoose.connect(uri);
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.equal(hello.isWritablePrimary, true, "Refusing a non-primary test replica set");
  t.after(() => mongoose.disconnect());
});

test("Payroll persists calculator-shaped embedded earnings and deductions", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved isolated database");
  await mongoose.connect(uri);
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.equal(hello.isWritablePrimary, true, "Refusing a non-primary test replica set");
  await Payroll.collection.deleteMany({});
  t.after(async () => { await Payroll.collection.deleteMany({}); await mongoose.disconnect(); });

  const calculation = calculatePayslip({
    basicSalary: 300,
    attendance: { workingDays: 26 },
  });
  const employeeId = new mongoose.Types.ObjectId();
  const payroll = await Payroll.create({
    payrollNumber: "PAY-PERSIST-TEST",
    periodMonth: 1,
    periodYear: 2099,
    payslips: [{
      employeeId,
      employeeCode: "EMP-PERSIST",
      employeeName: "Persistence Test",
      earnings: calculation.earnings,
      grossEarnings: calculation.grossEarnings,
      deductions: calculation.deductions,
      totalDeductions: calculation.totalDeductions,
      netPay: calculation.netPay,
    }],
  });
  const saved = await Payroll.findById(payroll._id);
  assert.deepEqual(saved.payslips[0].earnings.map(({ name, amount, type }) => ({ name, amount, type })), [
    { name: "Basic Salary", amount: 300, type: "fixed" },
  ]);
  assert.deepEqual(saved.payslips[0].deductions.map(({ name, amount, type }) => ({ name, amount, type })), [
    { name: "EPF Employee (8%)", amount: 24, type: "epf" },
  ]);
});

test("Payslip GET resolves async id and employeeId route params", async (t) => {
  assert.equal(process.env.MONGODB_URI, uri, "Refusing an unapproved isolated database");
  await mongoose.connect(uri);
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.equal(hello.isWritablePrimary, true, "Refusing a non-primary test replica set");
  process.env.JWT_SECRET = "payroll-route-test-secret";
  await Promise.all([Payroll.collection.deleteMany({}), Employee.collection.deleteMany({}), User.collection.deleteMany({}), mongoose.connection.collection("departments").deleteMany({}), mongoose.connection.collection("designations").deleteMany({})]);
  t.after(async () => { await Promise.all([Payroll.collection.deleteMany({}), Employee.collection.deleteMany({}), User.collection.deleteMany({}), mongoose.connection.collection("departments").deleteMany({}), mongoose.connection.collection("designations").deleteMany({})]); await mongoose.disconnect(); });

  const user = await User.create({ firstName: "Payslip", lastName: "Reader", email: "payslip-reader@example.invalid", password: "Password9!", role: "staff" });
  const departmentId = new mongoose.Types.ObjectId();
  const designationId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("departments").insertOne({ _id: departmentId, code: "PAY", name: "Payroll" });
  await mongoose.connection.collection("designations").insertOne({ _id: designationId, code: "OFF", name: "Officer" });
  const employee = await Employee.create({ firstName: "Asha", lastName: "Perera", dateOfJoining: "2099-01-01", departmentId, designationId });
  const payroll = await Payroll.create({
    payrollNumber: "PAY-GET-TEST",
    periodMonth: 1,
    periodYear: 2099,
    payslips: [{ employeeId: employee._id, employeeCode: employee.employeeCode, employeeName: employee.fullName, earnings: [{ name: "Basic Salary", amount: 300, type: "fixed" }], deductions: [{ name: "EPF Employee (8%)", amount: 24, type: "epf" }] }],
  });
  const request = new Request(`http://payroll.test/api/payroll/${payroll._id}/payslip/${employee._id}`, { headers: { authorization: `Bearer ${generateToken(user._id)}` } });
  const response = await getPayslip(request, { params: Promise.resolve({ id: payroll._id.toString(), employeeId: employee._id.toString() }) });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.data.payslip.employeeId, employee._id.toString());
  assert.equal(body.data.payroll.payrollNumber, "PAY-GET-TEST");
  assert.equal(body.data.employee.department, "Payroll");
  assert.equal(body.data.employee.designation, "Officer");
});

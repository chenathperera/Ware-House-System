import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Payroll and Payslip pages preserve source-backed routes and actions", async () => {
  const [register, detail, payslip] = await Promise.all([
    read("../src/app/(erp)/payroll/page.jsx"),
    read("../src/app/(erp)/payroll/[id]/page.jsx"),
    read("../src/app/(erp)/payroll/[id]/payslip/[employeeId]/page.jsx"),
  ]);
  for (const value of ["Process Monthly Payroll", "Overtime Rate", "periodMonth", "periodYear", "/payroll/"]) assert.ok(register.includes(value), value);
  for (const value of ["Approve", "Mark Paid", "Gross Earnings", "Total Deductions", "FileText"]) assert.ok(detail.includes(value), value);
  for (const value of ["PAYSLIP", "Earnings", "Deductions", "window.print()", "EPF Employer (12%)", "ETF (3%)"]) assert.ok(payslip.includes(value), value);
  for (const unsupported of ["PDF", "email", "download"]) assert.equal(`${register}${detail}${payslip}`.toLowerCase().includes(unsupported), false, unsupported);
});

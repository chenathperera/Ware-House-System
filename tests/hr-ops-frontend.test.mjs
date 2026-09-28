import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const includesAll = (source, values) => {
  for (const value of values) assert.ok(source.includes(value), value);
};

test("Attendance frontend retains source-backed bulk attendance controls", async () => {
  const page = await read("../src/app/(erp)/attendance/page.jsx");
  includesAll(page, ["Bulk Mark Attendance", "Check In", "Check Out", "lateMinutes", "overtimeMinutes", "half_day", "holiday", "weekend"]);
});

test("Leave Request frontend retains lifecycle and compensatory leave", async () => {
  const page = await read("../src/app/(erp)/leaves/page.jsx");
  includesAll(page, ["compensatory", "Approve Leave", "Reject Leave", "Cancel Leave", "Rejection Reason", "All fields required"]);
});

test("Holiday frontend retains source fields, filtering, view, edit and soft-delete confirmation", async () => {
  const page = await read("../src/app/(erp)/holidays/page.jsx");
  includesAll(page, ["Filter Year", "View Holiday", "Edit Holiday", "Delete Holiday", "Name and date required", 'value: "public"', 'value: "national"', 'value: "religious"', 'value: "poya"', 'value: "company"']);
});

test("Salary Structure frontend remains template-oriented with source component controls", async () => {
  const page = await read("../src/app/(erp)/salary-structures/page.jsx");
  includesAll(page, ["Name required", "Add Component", "Fixed Amount", "% of Basic", "Taxable", "Delete Structure", "View Salary Structure", "Edit Salary Structure"]);
  for (const unsupported of ["effectiveDate", "salaryHistory", "payslip"]) assert.equal(page.includes(unsupported), false, unsupported);
});

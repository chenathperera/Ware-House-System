import "server-only";

const slabs = [
  { upto: 150000, rate: 0, cumulative: 0 }, { upto: 233333, rate: 0.06, cumulative: 0 },
  { upto: 275000, rate: 0.18, cumulative: 5000 }, { upto: 316667, rate: 0.24, cumulative: 12500 },
  { upto: 358333, rate: 0.30, cumulative: 22500 }, { upto: Infinity, rate: 0.36, cumulative: 35000 },
];
export const calculateAPIT = (income) => { const value = Number(income) || 0; if (value <= 0) return 0; let previous = 0; for (const slab of slabs) { if (value <= slab.upto) return +(slab.cumulative + ((value - previous) * slab.rate)).toFixed(2); previous = slab.upto; } return 0; };
export const calculateEPFEmployee = (earnings, rate = 0.08) => +(Number(earnings) * rate).toFixed(2);
export const calculateEPFEmployer = (earnings, rate = 0.12) => +(Number(earnings) * rate).toFixed(2);
export const calculateETF = (earnings, rate = 0.03) => +(Number(earnings) * rate).toFixed(2);
export function calculatePayslip({ basicSalary = 0, earnings = [], otherDeductions = [], attendance = {}, overtimeRate = 0 }) {
  const basic = Number(basicSalary) || 0;
  const workingDays = Math.max(1, attendance.workingDays || 26);
  const unpaidLeaveDays = Number(attendance.unpaidLeaveDays) || 0;
  const unpaidLeaveDeduction = unpaidLeaveDays > 0 ? +((basic / workingDays) * unpaidLeaveDays).toFixed(2) : 0;
  const allEarnings = [{ name: "Basic Salary", amount: basic - unpaidLeaveDeduction, type: "fixed", isTaxable: true, isEpfable: true }];
  earnings.forEach((earning) => allEarnings.push({ name: earning.name, amount: Number(earning.amount) || 0, type: earning.type || "allowance", isTaxable: earning.isTaxable !== false, isEpfable: earning.isEpfable !== false }));
  const overtimeHours = Number(attendance.overtimeHours) || 0;
  const overtime = +(overtimeHours * overtimeRate).toFixed(2);
  if (overtime > 0) allEarnings.push({ name: "Overtime", amount: overtime, type: "overtime", isTaxable: true, isEpfable: false });
  const grossEarnings = +allEarnings.reduce((sum, earning) => sum + earning.amount, 0).toFixed(2);
  const epfableEarnings = +allEarnings.filter((earning) => earning.isEpfable).reduce((sum, earning) => sum + earning.amount, 0).toFixed(2);
  const taxableEarnings = +allEarnings.filter((earning) => earning.isTaxable).reduce((sum, earning) => sum + earning.amount, 0).toFixed(2);
  const epfEmployee = calculateEPFEmployee(epfableEarnings); const epfEmployer = calculateEPFEmployer(epfableEarnings); const etf = calculateETF(epfableEarnings); const apit = calculateAPIT(taxableEarnings);
  const deductions = []; if (epfEmployee > 0) deductions.push({ name: "EPF Employee (8%)", amount: epfEmployee, type: "epf" }); if (apit > 0) deductions.push({ name: "APIT (Income Tax)", amount: apit, type: "apit" });
  let advanceDeducted = 0; let loanDeducted = 0;
  otherDeductions.forEach((deduction) => { const amount = Number(deduction.amount) || 0; deductions.push({ name: deduction.name, amount, type: deduction.type || "other" }); if (deduction.type === "advance") advanceDeducted += amount; if (deduction.type === "loan") loanDeducted += amount; });
  const totalDeductions = +deductions.reduce((sum, deduction) => sum + deduction.amount, 0).toFixed(2);
  return { basicSalary: basic, effectiveBasic: basic - unpaidLeaveDeduction, unpaidLeaveDays, unpaidLeaveDeduction, overtimeHours, earnings: allEarnings, grossEarnings, epfableEarnings, taxableEarnings, deductions, totalDeductions, epfEmployeeContribution: epfEmployee, epfEmployerContribution: epfEmployer, etfContribution: etf, apitAmount: apit, advanceDeducted: +advanceDeducted.toFixed(2), loanDeducted: +loanDeducted.toFixed(2), netPay: +(grossEarnings - totalDeductions).toFixed(2) };
}

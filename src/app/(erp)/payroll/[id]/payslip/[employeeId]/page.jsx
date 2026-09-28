"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Button from "../../../../../../components/ui/Button.jsx";
import Card from "../../../../../../components/ui/Card.jsx";
import PageHeader from "../../../../../../components/ui/PageHeader.jsx";
import { usePayslip } from "../../../../../../client/features/hr/useHr.js";

const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function PayslipPage() {
  const { id, employeeId } = useParams();
  const router = useRouter();
  const data = usePayslip(id, employeeId).data?.data;

  if (!data) {
    return <div className="py-16 text-center text-gray-500">Loading...</div>;
  }

  const { payslip, payroll, employee } = data;
  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.push(`/payroll/${id}`)}>
        <ArrowLeft size={16} className="mr-1.5" />
        Back
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer size={16} className="mr-1.5" />
        Print
      </Button>
    </div>
  );

  return (
    <div>
      <PageHeader title="Payslip" actions={actions} />
      <Card className="print-container max-w-3xl p-8">
        <div className="mb-4 flex justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-bold">PAYSLIP</h2>
            <p>{names[payroll.periodMonth - 1]} {payroll.periodYear}</p>
            <p className="font-mono text-xs">{payroll.payrollNumber}</p>
          </div>
          <p>
            {new Date(payroll.periodStartDate).toLocaleDateString("en-LK")} — {new Date(payroll.periodEndDate).toLocaleDateString("en-LK")}
          </p>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold">Employee</p>
            <p>
              {employee.firstName} {employee.lastName}
            </p>
            <p>{employee.employeeCode}</p>
            <p>{employee.designation} · {employee.department}</p>
          </div>
          <div>
            <p className="font-semibold">Statutory</p>
            <p>EPF: {employee.epfNumber || "—"}</p>
            <p>Bank: {employee.bankDetails?.bankName || "—"}</p>
            <p>Account: {employee.bankDetails?.accountNumber || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <section>
            <p className="mb-2 font-semibold">Earnings</p>
            {payslip.earnings?.map((item, index) => (
              <div key={index} className="flex justify-between border-b py-1">
                <span>{item.name}</span>
                <span>{money(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-semibold">
              <span>Gross Earnings</span>
              <span>{money(payslip.grossEarnings)}</span>
            </div>
          </section>
          <section>
            <p className="mb-2 font-semibold">Deductions</p>
            {payslip.deductions?.map((item, index) => (
              <div key={index} className="flex justify-between border-b py-1">
                <span>{item.name}</span>
                <span>-{money(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-semibold">
              <span>Total Deductions</span>
              <span>-{money(payslip.totalDeductions)}</span>
            </div>
          </section>
        </div>
        <div className="mt-6 flex justify-between border-t-2 pt-4">
          <div>
            <p className="text-xs">NET PAY</p>
            <p className="text-2xl font-bold">{money(payslip.netPay)}</p>
          </div>
          <div className="text-right text-sm">
            <p>EPF Employer (12%): {money(payslip.epfEmployerContribution)}</p>
            <p>ETF (3%): {money(payslip.etfContribution)}</p>
            <p className="italic">Employer contributions (not deducted from salary)</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

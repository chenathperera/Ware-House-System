"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, DollarSign, FileText } from "lucide-react";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Table from "../../../../components/ui/Table.jsx";
import { usePayroll, usePayrollActions } from "../../../../client/features/hr/useHr.js";

const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value || 0);

function TotalCard({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </Card>
  );
}

export default function PayrollDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const payroll = usePayroll(id).data?.data;
  const actions = usePayrollActions();
  const [confirm, setConfirm] = useState(null);

  if (!payroll) {
    return <div className="py-16 text-center text-gray-500">Loading...</div>;
  }

  const handleAction = async () => {
    if (confirm === "approve") {
      await actions.approve.mutateAsync(payroll._id);
    } else {
      await actions.markPaid.mutateAsync(payroll._id);
    }
    setConfirm(null);
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (row) => (
        <div>
          <p className="font-medium">{row.employeeName}</p>
          <p className="font-mono text-xs text-gray-500">{row.employeeCode}</p>
        </div>
      ),
    },
    {
      key: "attendance",
      label: "Attendance",
      render: (row) => `Present: ${row.daysPresent}/${row.workingDays}`,
    },
    { key: "basicSalary", label: "Basic", render: (row) => money(row.basicSalary) },
    { key: "gross", label: "Gross", render: (row) => money(row.grossEarnings) },
    { key: "deductions", label: "Deductions", render: (row) => money(row.totalDeductions) },
    {
      key: "net",
      label: "Net Pay",
      render: (row) => <span className="font-semibold">{money(row.netPay)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={row.paymentStatus === "paid" ? "success" : "default"}>
          {row.paymentStatus}
        </Badge>
      ),
    },
    {
      key: "view",
      label: "",
      render: (row) => (
        <button
          className="rounded p-1.5 hover:bg-gray-100"
          onClick={() => router.push(`/payroll/${payroll._id}/payslip/${row.employeeId}`)}
        >
          <FileText size={16} />
        </button>
      ),
    },
  ];

  const pageActions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.push("/payroll")}>
        <ArrowLeft size={16} className="mr-1.5" />
        Back
      </Button>
      {payroll.status === "processed" && (
        <Button variant="primary" onClick={() => setConfirm("approve")}>
          <CheckCircle size={16} className="mr-1.5" />
          Approve
        </Button>
      )}
      {payroll.status === "approved" && (
        <Button variant="primary" onClick={() => setConfirm("pay")}>
          <DollarSign size={16} className="mr-1.5" />
          Mark Paid
        </Button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={payroll.payrollNumber}
        description={`${names[payroll.periodMonth - 1]} ${payroll.periodYear} · ${payroll.totalEmployees} employees`}
        actions={pageActions}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TotalCard label="Gross Earnings" value={money(payroll.totalGrossEarnings)} />
        <TotalCard label="Total Deductions" value={money(payroll.totalDeductions)} />
        <TotalCard label="EPF Employer (12%)" value={money(payroll.totalEpfEmployer)} />
        <TotalCard label="Net Payable" value={money(payroll.totalNetPay)} />
      </div>
      <Card>
        <Table columns={columns} data={payroll.payslips || []} />
      </Card>
      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        title={confirm === "approve" ? "Approve Payroll" : "Mark Payroll Paid"}
        message={confirm === "approve" ? "Approve this payroll? After approval, you can mark it paid." : "Mark all payslips as paid? This updates payment status for all employees."}
        loading={actions.approve.isPending || actions.markPaid.isPending}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Eye, Play } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { usePayrolls, useProcessPayroll } from "../../../client/features/hr/useHr.js";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const variants = { draft: "default", processed: "warning", approved: "info", paid: "success", closed: "default" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function PayrollPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [overtimeRate, setOvertimeRate] = useState(0);
  const payrolls = usePayrolls({ year }).data?.data || [];
  const process = useProcessPayroll();
  const options = months.map((label, index) => ({ value: index + 1, label }));

  const submit = async () => {
    const result = await process.mutateAsync({
      periodMonth: +month,
      periodYear: +periodYear,
      overtimeRatePerHour: +overtimeRate || 0,
    });
    setOpen(false);
    router.push(`/payroll/${result.data._id}`);
  };

  const columns = [
    { key: "payrollNumber", label: "Ref" },
    { key: "period", label: "Period", render: (row) => `${months[row.periodMonth - 1]} ${row.periodYear}` },
    { key: "employees", label: "Employees", render: (row) => row.totalEmployees },
    { key: "gross", label: "Gross", render: (row) => money(row.totalGrossEarnings) },
    { key: "deductions", label: "Deductions", render: (row) => money(row.totalDeductions) },
    { key: "net", label: "Net Pay", render: (row) => <span className="font-semibold">{money(row.totalNetPay)}</span> },
    { key: "status", label: "Status", render: (row) => <Badge variant={variants[row.status]}>{row.status}</Badge> },
    { key: "view", label: "", render: (row) => <button className="rounded p-1.5 hover:bg-gray-100" onClick={() => router.push(`/payroll/${row._id}`)}><Eye size={16} /></button> },
  ];

  const actions = (
    <Button
      variant="primary"
      onClick={() => setOpen(true)}
    >
      <Play size={16} className="mr-1.5" />
      Process Payroll
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Monthly payroll processing"
        actions={actions}
      />

      <Card>
        <div className="w-32 border-b p-4">
          <Input
            type="number"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </div>

        {payrolls.length ? (
          <Table
            columns={columns}
            data={payrolls}
            onRowClick={(row) => router.push(`/payroll/${row._id}`)}
          />
        ) : (
          <EmptyState
            icon={DollarSign}
            title={`No payroll for ${year}`}
            description="Process monthly payroll to generate payslips"
          />
        )}
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Process Monthly Payroll"
        size="md"
      >
        <div className="space-y-4 p-6">
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Before processing:</strong> ensure attendance is marked and leaves are approved. EPF 8% employee + 12% employer, ETF 3%, and APIT income tax are auto-calculated.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Month"
              required
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              options={options}
            />
            <Input
              label="Year"
              required
              type="number"
              value={periodYear}
              onChange={(event) => setPeriodYear(event.target.value)}
            />
          </div>

          <Input
            label="Overtime Rate (LKR per hour)"
            type="number"
            min="0"
            step="0.01"
            value={overtimeRate}
            onChange={(event) => setOvertimeRate(event.target.value)}
            placeholder="0 = no overtime calculation"
          />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={process.isPending}>
            Process
          </Button>
        </div>
      </Modal>
    </div>
  );
}

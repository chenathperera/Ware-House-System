"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Badge from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";
import Input from "../ui/Input.jsx";
import Table from "../ui/Table.jsx";
import { money, monthStart, ReportHeader, today } from "./ReportLayout.jsx";
import {
  useAttendanceReport,
  useDamagesReport,
  useFinancialSnapshot,
  useHeadcountReport,
  useLeavePatternsReport,
  usePayrollSummaryReport,
  useProductionByProduct,
  useProductionSummary,
  useProductionWastage,
  useReturnsSummary,
} from "../../client/features/reports/useReports.js";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
function Dates({ startDate, endDate, setStartDate, setEndDate }) {
  return (
    <Card className="mb-4 p-4">
      <div className="flex gap-3">
        <Input
          label="From"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <Input
          label="To"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>
    </Card>
  );
}
function Kpi({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </Card>
  );
}

export function ProductionReport() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const summaryQuery = useProductionSummary({ startDate, endDate });
  const productsQuery = useProductionByProduct({ startDate, endDate });
  const wastageQuery = useProductionWastage({ startDate, endDate });
  const summary = summaryQuery.data?.data?.summary;
  const products = productsQuery.data?.data || [];
  const wastage = wastageQuery.data?.data;
  return (
    <div>
      <ReportHeader
        title="Production Reports"
        description="Manufacturing performance analysis"
      />
      <Dates {...{ startDate, endDate, setStartDate, setEndDate }} />
      {!summary ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Production Orders" value={summary.totalOrders} />
            <Kpi label="Units Produced" value={summary.totalProducedQty} />
            <Kpi label="Total Cost" value={money(summary.totalActualCost)} />
            <Kpi
              label="Cost Variance"
              value={money(summary.totalVariance)}
            />
          </div>
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <div className="border-b px-6 py-4 text-sm font-semibold">
                By Department
              </div>
              <Table
                columns={[
                  {
                    key: "name",
                    label: "Department",
                    render: (row) => row.name || "Unassigned",
                  },
                  { key: "count", label: "Headcount" },
                ]}
                data={head.byDepartment}
              />
            </Card>
            <Card>
              <div className="border-b px-6 py-4 text-sm font-semibold">
                By Employment Type
              </div>
              <Table
                columns={[
                  {
                    key: "_id",
                    label: "Type",
                    render: (row) => row._id?.replace(/_/g, " "),
                  },
                  { key: "count", label: "Count" },
                ]}
                data={head.byEmploymentType}
              />
            </Card>
          </div>
          <Card className="mb-6">
            <div className="border-b px-6 py-4 text-sm font-semibold">
              Production by Product
            </div>
            <Table
              columns={[
                { key: "productCode", label: "Code" },
                { key: "productName", label: "Product" },
                { key: "orderCount", label: "Orders" },
                { key: "totalPlanned", label: "Planned Qty" },
                { key: "totalProduced", label: "Produced" },
                {
                  key: "yieldPercent",
                  label: "Yield %",
                  render: (row) => <Badge>{row.yieldPercent}%</Badge>,
                },
                {
                  key: "avgCostPerUnit",
                  label: "Avg Cost/Unit",
                  render: (row) => money(row.avgCostPerUnit),
                },
                {
                  key: "totalActualCost",
                  label: "Total Cost",
                  render: (row) => money(row.totalActualCost),
                },
              ]}
              data={products}
            />
          </Card>
          {wastage?.byProduct?.length > 0 && (
            <Card>
            <div className="border-b px-6 py-4 text-sm font-semibold">
              Production Wastage by Product
            </div>
            <Table
              columns={[
                { key: "productCode", label: "Code" },
                { key: "productName", label: "Product" },
                { key: "count", label: "Incidents" },
                { key: "totalQuantity", label: "Quantity" },
                {
                  key: "totalValue",
                  label: "Value",
                  render: (row) => money(row.totalValue),
                },
              ]}
              data={wastage?.byProduct || []}
            />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export function ReturnsReport() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const returnsQuery = useReturnsSummary({ startDate, endDate });
  const damageQuery = useDamagesReport({ startDate, endDate });
  const returns = returnsQuery.data?.data;
  const damages = damageQuery.data?.data;
  return (
    <div>
      <ReportHeader
        title="Returns & Damages Reports"
        description="Return patterns and damage trends"
      />
      <Dates {...{ startDate, endDate, setStartDate, setEndDate }} />
      {!returns || !damages ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Returns" value={returns.summary.totalReturns} />
            <Kpi
              label="Return Value"
              value={money(returns.summary.totalValue)}
            />
            <Kpi
              label="Total Refunded"
              value={money(returns.summary.totalRefunded)}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold">Returns by Reason</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={returns.byReason}
                    dataKey="count"
                    nameKey="_id"
                    outerRadius={80}
                  >
                    {returns.byReason.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <div className="border-b px-6 py-4 text-sm font-semibold">
                Top Customers by Returns
              </div>
              <Table
                columns={[
                  { key: "customerName", label: "Customer" },
                  { key: "customerCode", label: "Code" },
                  { key: "returnCount", label: "Returns" },
                  {
                    key: "totalValue",
                    label: "Value",
                    render: (row) => money(row.totalValue),
                  },
                ]}
                data={returns.byCustomer}
              />
            </Card>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Kpi label="Damage Incidents" value={damages.summary.count} />
            <Kpi
              label="Total Value Lost"
              value={money(damages.summary.totalValue)}
            />
          </div>
          <Card>
            <div className="border-b px-6 py-4 text-sm font-semibold">
              Damages by Source
            </div>
            <Table
              columns={[
                { key: "_id", label: "Source" },
                { key: "count", label: "Incidents" },
                {
                  key: "value",
                  label: "Value",
                  render: (row) => money(row.value),
                },
              ]}
              data={damages.bySource}
            />
          </Card>
        </>
      )}
    </div>
  );
}

export function FinancialSnapshotReport() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const { data } = useFinancialSnapshot({ startDate, endDate });
  const report = data?.data;
  const aging = (title, values) => (
    <Card className="p-6">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {[
        ["Current", "current"],
        ["1-30 days", "b1_30"],
        ["31-60 days", "b31_60"],
        ["61-90 days", "b61_90"],
        ["91+ days", "b91_plus"],
        ["Total", "total"],
      ].map(([label, key]) => (
        <div
          key={key}
          className="flex justify-between border-b p-2 last:border-0"
        >
          <span>{label}</span>
          <strong>{money(values?.[key])}</strong>
        </div>
      ))}
    </Card>
  );
  return (
    <div>
      <ReportHeader
        title="Financial Snapshot"
        description="Revenue vs expenses, A/R + A/P"
      />
      <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Note:</strong> This is an operational snapshot, not a formal
        P&L. For tax or audit purposes, use dedicated accounting software that
        exports from this system.
      </Card>
      <Dates {...{ startDate, endDate, setStartDate, setEndDate }} />
      {!report ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Revenue (Invoiced)" value={money(report.revenue)} />
            <Kpi label="Expenses (Billed)" value={money(report.expenses)} />
            <Kpi label="Gross Profit" value={money(report.grossProfit)} />
            <Kpi label="Net Cash Flow" value={money(report.netCashFlow)} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {aging("Accounts Receivable (Aging)", report.accountsReceivable)}
            {aging("Accounts Payable (Aging)", report.accountsPayable)}
          </div>
        </>
      )}
    </div>
  );
}

export function HrReports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const head = useHeadcountReport().data?.data;
  const attendance = useAttendanceReport({ startDate, endDate }).data?.data;
  const leave = useLeavePatternsReport({ year }).data?.data;
  const payroll = usePayrollSummaryReport({ year }).data?.data;
  return (
    <div>
      <ReportHeader
        title="HR Reports"
        description="Headcount, attendance, leave patterns, payroll"
      />
      {head && (
        <>
          <h2 className="mb-3 text-sm font-semibold">Headcount</h2>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Total Employees" value={head.total} />
            <Kpi label="Departments" value={head.byDepartment.length} />
            <Kpi
              label="Active"
              value={
                head.byStatus.find((item) => item._id === "active")?.count || 0
              }
            />
            <Kpi
              label="On Probation"
              value={
                head.byStatus.find((item) => item._id === "probation")?.count ||
                0
              }
            />
          </div>
        </>
      )}
      <h2 className="mb-3 text-sm font-semibold">Attendance Summary</h2>
      <Dates {...{ startDate, endDate, setStartDate, setEndDate }} />
      {attendance?.byEmployee?.length ? (
        <Card className="mb-6">
          <Table
            columns={[
              { key: "employeeName", label: "Employee" },
              { key: "present", label: "Present" },
              { key: "absent", label: "Absent" },
              { key: "late", label: "Late" },
              { key: "leave", label: "Leave" },
              { key: "halfDay", label: "Half Day" },
              { key: "totalLateMinutes", label: "Late Min" },
              {
                key: "totalOvertimeMinutes",
                label: "OT Hours",
                render: (row) => (row.totalOvertimeMinutes / 60).toFixed(1),
              },
            ]}
            data={attendance.byEmployee}
          />
        </Card>
      ) : null}
      <h2 className="mb-3 text-sm font-semibold">Leave Patterns ({year})</h2>
      <Card className="mb-4 p-4">
        <Input
          className="w-32"
          type="number"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        />
      </Card>
      {leave && (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
          <Table
            columns={[
              { key: "_id", label: "Type" },
              { key: "count", label: "Requests" },
              { key: "totalDays", label: "Total Days" },
            ]}
            data={leave.byType}
          />
          </Card>
          <Card>
            <div className="border-b px-6 py-4 text-sm font-semibold">
              Top Leave Takers
            </div>
            <Table
              columns={[
                { key: "employeeName", label: "Employee" },
                { key: "employeeCode", label: "Code" },
                { key: "leaveCount", label: "Leaves" },
                { key: "totalDays", label: "Days" },
              ]}
              data={leave.topTakers}
            />
          </Card>
        </div>
      )}
      <h2 className="mb-3 text-sm font-semibold">Payroll Summary ({year})</h2>
      {payroll && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="YTD Gross" value={money(payroll.yearTotals.gross, 0)} />
            <Kpi label="YTD Net Pay" value={money(payroll.yearTotals.netPay, 0)} />
            <Kpi
              label="YTD EPF (8%+12%)"
              value={money(
                payroll.yearTotals.epfEmployee + payroll.yearTotals.epfEmployer,
                0,
              )}
            />
            <Kpi label="YTD APIT" value={money(payroll.yearTotals.apit, 0)} />
          </div>
          <Card>
          <Table
            columns={[
              { key: "periodMonth", label: "Month" },
              { key: "totalEmployees", label: "Emp Count" },
              {
                key: "totalGrossEarnings",
                label: "Gross",
                render: (row) => money(row.totalGrossEarnings),
              },
              {
                key: "totalEpfEmployee",
                label: "EPF Emp",
                render: (row) => money(row.totalEpfEmployee),
              },
              {
                key: "totalEpfEmployer",
                label: "EPF Empr",
                render: (row) => money(row.totalEpfEmployer),
              },
              {
                key: "totalEtf",
                label: "ETF",
                render: (row) => money(row.totalEtf),
              },
              {
                key: "totalApit",
                label: "APIT",
                render: (row) => money(row.totalApit),
              },
              {
                key: "totalNetPay",
                label: "Net Pay",
                render: (row) => money(row.totalNetPay),
              },
              { key: "status", label: "Status" },
            ]}
            data={payroll.monthly}
          />
          </Card>
        </>
      )}
    </div>
  );
}

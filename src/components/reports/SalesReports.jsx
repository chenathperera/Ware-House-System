"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import Table from "../ui/Table.jsx";
import {
  downloadCsv,
  money,
  monthStart,
  number,
  ReportHeader,
  today,
} from "./ReportLayout.jsx";
import {
  useSalesByCustomer,
  useSalesByProduct,
  useSalesSummary,
  useSalesTrend,
} from "../../client/features/reports/useReports.js";

function DateFilters({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  presets = false,
}) {
  const applyPreset = (preset) => {
    const end = new Date();
    if (preset === "today") setStartDate(today());
    else if (preset === "yesterday") {
      end.setDate(end.getDate() - 1);
      setStartDate(end.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    } else {
      const start = new Date();
      start.setDate(end.getDate() - preset);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(today());
    }
    if (preset === "today") setEndDate(today());
  };
  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Input
            label="From"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            label="To"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
        {presets && (
          <div className="ml-auto flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("today")}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("yesterday")}
            >
              Yesterday
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>
              Last 7d
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>
              Last 30d
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(90)}>
              Last 90d
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function SalesSummaryReport() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [groupBy, setGroupBy] = useState("day");
  const { data, isLoading } = useSalesSummary({ startDate, endDate });
  const { data: trend } = useSalesTrend({ startDate, endDate, groupBy });
  const report = data?.data;
  return (
    <div>
      <ReportHeader
        title="Sales Summary Report"
        description="Overall sales performance"
      />
      <DateFilters {...{ startDate, endDate, setStartDate, setEndDate }} />
      <Card className="mb-4 p-4">
        <div className="w-40">
          <Select
            label="Group trend by"
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </div>
      </Card>
      {isLoading || !report ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Sales Orders" value={report.orders.totalOrders} />
            <Metric
              label="Order Value"
              value={money(report.orders.totalValue)}
            />
            <Metric label="Invoices" value={money(report.invoices.total)} />
            <Metric
              label="Collected"
              value={money(report.payments.collected)}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold">Sales Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis yAxisId="value" />
                  <YAxis yAxisId="count" orientation="right" />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Order Value" ? money(value) : value
                    }
                  />
                  <Line
                    yAxisId="value"
                    type="monotone"
                    dataKey="total"
                    name="Order Value"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="count"
                    name="Order Count"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold">Order Status</h2>
              <Table
                columns={[
                  { key: "_id", label: "Status" },
                  { key: "count", label: "Orders" },
                  {
                    key: "value",
                    label: "Value",
                    render: (row) => money(row.value),
                  },
                ]}
                data={report.statusBreakdown}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </Card>
  );
}

export function SalesByProductReport() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const { data, isLoading } = useSalesByProduct({
    startDate,
    endDate,
    limit: 100,
  });
  const products = data?.data || [];
  const exportCsv = () =>
    downloadCsv(
      [
        [
          "Rank",
          "Product Code",
          "Product Name",
          "Qty Sold",
          "Avg Price",
          "Gross Revenue",
          "Discount",
          "Net Revenue",
          "Orders",
        ],
        ...products.map((row, index) => [
          index + 1,
          row.productCode,
          row.productName,
          row.quantitySold,
          row.avgPrice.toFixed(2),
          row.grossRevenue.toFixed(2),
          row.totalDiscount.toFixed(2),
          row.netRevenue.toFixed(2),
          row.orderCount,
        ]),
      ],
      `sales-by-product-${startDate}-to-${endDate}.csv`,
    );
  return (
    <div>
      <ReportHeader
        title="Sales by Product"
        description="Product-level sales performance"
        actions={
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!products.length}
          >
            <Download size={16} className="mr-1.5" />
            Export CSV
          </Button>
        }
      />
      <DateFilters
        {...{ startDate, endDate, setStartDate, setEndDate }}
        presets
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Products Sold" value={products.length} />
        <Metric
          label="Total Units"
          value={number(
            products.reduce((sum, row) => sum + row.quantitySold, 0),
          )}
        />
        <Metric
          label="Total Net Revenue"
          value={money(products.reduce((sum, row) => sum + row.netRevenue, 0))}
        />
      </div>
      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : !products.length ? (
          <div className="py-16 text-center text-gray-500">
            No sales data for this period
          </div>
        ) : (
          <Table columns={productColumns} data={products} />
        )}
      </Card>
    </div>
  );
}

const productColumns = [
  { key: "productCode", label: "Code" },
  { key: "productName", label: "Product" },
  {
    key: "quantitySold",
    label: "Qty Sold",
    render: (row) => number(row.quantitySold),
  },
  { key: "avgPrice", label: "Avg Price", render: (row) => money(row.avgPrice) },
  {
    key: "grossRevenue",
    label: "Gross Rev.",
    render: (row) => money(row.grossRevenue),
  },
  {
    key: "totalDiscount",
    label: "Discount",
    render: (row) => `-${money(row.totalDiscount)}`,
  },
  {
    key: "netRevenue",
    label: "Net Rev.",
    render: (row) => money(row.netRevenue),
  },
  { key: "orderCount", label: "Orders" },
];

export function SalesByCustomerReport() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const { data, isLoading } = useSalesByCustomer({
    startDate,
    endDate,
    limit: 100,
  });
  const customers = data?.data || [];
  const exportCsv = () =>
    downloadCsv(
      [
        [
          "Rank",
          "Customer Code",
          "Customer Name",
          "Orders",
          "Total Ordered",
          "Avg Order",
          "Invoiced",
          "Paid",
          "Outstanding",
        ],
        ...customers.map((row, index) => [
          index + 1,
          row.customerCode,
          row.customerName,
          row.orderCount,
          row.totalOrdered,
          row.avgOrderValue,
          row.invoiced,
          row.paid,
          row.outstanding,
        ]),
      ],
      `sales-by-customer-${startDate}-to-${endDate}.csv`,
    );
  const total = (key) => customers.reduce((sum, row) => sum + row[key], 0);
  return (
    <div>
      <ReportHeader
        title="Sales by Customer"
        description="Customer-level performance and balances"
        actions={
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!customers.length}
          >
            <Download size={16} className="mr-1.5" />
            Export CSV
          </Button>
        }
      />
      <DateFilters
        {...{ startDate, endDate, setStartDate, setEndDate }}
        presets
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Customers" value={customers.length} />
        <Metric label="Total Ordered" value={money(total("totalOrdered"))} />
        <Metric label="Paid" value={money(total("paid"))} />
        <Metric label="Outstanding" value={money(total("outstanding"))} />
      </div>
      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : !customers.length ? (
          <div className="py-16 text-center text-gray-500">
            No sales for this period
          </div>
        ) : (
          <Table columns={customerColumns} data={customers} />
        )}
      </Card>
    </div>
  );
}

const customerColumns = [
  { key: "customerCode", label: "Code" },
  { key: "customerName", label: "Customer" },
  { key: "orderCount", label: "Orders" },
  {
    key: "totalOrdered",
    label: "Total Ordered",
    render: (row) => money(row.totalOrdered),
  },
  {
    key: "avgOrderValue",
    label: "Avg Order",
    render: (row) => money(row.avgOrderValue),
  },
  { key: "invoiced", label: "Invoiced", render: (row) => money(row.invoiced) },
  { key: "paid", label: "Paid", render: (row) => money(row.paid) },
  {
    key: "outstanding",
    label: "Outstanding",
    render: (row) => (row.outstanding ? money(row.outstanding) : "—"),
  },
];

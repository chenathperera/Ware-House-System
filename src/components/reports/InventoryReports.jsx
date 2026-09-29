"use client";

import { useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import Table from "../ui/Table.jsx";
import {
  downloadCsv,
  money,
  number,
  ReportHeader,
  today,
} from "./ReportLayout.jsx";
import {
  useLowStockReport,
  useSlowFastMovers,
  useStockMovement,
  useStockValuation,
} from "../../client/features/reports/useReports.js";
import { useWarehouses } from "../../client/features/warehouses/useWarehouses.js";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

export function StockValuationReport() {
  const [warehouseId, setWarehouseId] = useState("");
  const { data, isLoading } = useStockValuation({
    warehouseId: warehouseId || undefined,
  });
  const { data: warehouseData } = useWarehouses({ isActive: true });
  const report = data?.data;
  const options = [
    { value: "", label: "All Warehouses" },
    ...(warehouseData?.data || []).map((item) => ({
      value: item._id,
      label: item.name,
    })),
  ];
  const exportCsv = () =>
    downloadCsv(
      [
        [
          "Product Code",
          "Product Name",
          "Type",
          "Warehouse",
          "On Hand",
          "Reserved",
          "Available",
          "Cost/Unit",
          "Total Value",
        ],
        ...(report?.items || []).map((row) => [
          row.productCode,
          row.productName,
          row.productType,
          row.warehouseName,
          row.onHand,
          row.reserved,
          row.available,
          row.costPerUnit,
          row.totalValue,
        ]),
      ],
      `stock-valuation-${today()}.csv`,
    );
  return (
    <div>
      <ReportHeader
        title="Stock Valuation"
        description="Total inventory value"
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!report}>
            <Download size={16} className="mr-1.5" />
            Export CSV
          </Button>
        }
      />
      <Card className="mb-4 p-4">
        <div className="w-64">
          <Select
            label="Warehouse"
            options={options}
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          />
        </div>
      </Card>
      {isLoading || !report ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Summary
              label="Total Value"
              value={money(report.summary.totalValue)}
            />
            <Summary
              label="Total Units"
              value={number(report.summary.totalUnits)}
            />
            <Summary label="Stock Items" value={report.summary.productCount} />
          </div>
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold">
                Value by Product Type
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={report.byProductType}
                    dataKey="value"
                    nameKey="type"
                    outerRadius={80}
                    label={(entry) =>
                      `${entry.type}: ${((entry.value / report.summary.totalValue) * 100).toFixed(0)}%`
                    }
                  >
                    {report.byProductType.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold">Type Breakdown</h2>
              {report.byProductType.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between border-b p-2 last:border-0"
                >
                  <div>
                    <Badge>{item.type?.replace(/_/g, " ")}</Badge>
                    <span className="ml-2 text-sm">
                      {item.items} item{item.items !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{money(item.value)}</p>
                    <p className="text-xs text-gray-500">
                      {number(item.units)} units
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
          <Card>
            <Table columns={valuationColumns} data={report.items} />
          </Card>
        </>
      )}
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </Card>
  );
}
const valuationColumns = [
  { key: "productCode", label: "Code" },
  { key: "productName", label: "Product" },
  { key: "productType", label: "Type" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "onHand", label: "On Hand", render: (row) => number(row.onHand) },
  { key: "reserved", label: "Reserved", render: (row) => number(row.reserved) },
  {
    key: "available",
    label: "Available",
    render: (row) => number(row.available),
  },
  {
    key: "costPerUnit",
    label: "Cost/Unit",
    render: (row) => money(row.costPerUnit),
  },
  {
    key: "totalValue",
    label: "Total Value",
    render: (row) => money(row.totalValue),
  },
];

export function LowStockReport() {
  const { data, isLoading } = useLowStockReport();
  const items = data?.data || [];
  return (
    <div>
      <ReportHeader
        title="Low Stock Alerts"
        description="Products at or below reorder level"
      />
      {!items.length && !isLoading ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-medium text-green-600">
            All stock levels are healthy
          </p>
          <p className="mt-1 text-sm text-gray-500">
            No products below reorder level
          </p>
        </Card>
      ) : (
        <>
          {
            <Card className="mb-4 border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm text-amber-900">
                <AlertTriangle size={16} />
                <strong>{items.length} products</strong> need attention.
                Consider creating purchase orders for suppliers.
              </p>
            </Card>
          }
          <Card>
            {isLoading ? (
              <div className="py-16 text-center text-gray-500">Loading...</div>
            ) : (
              <Table columns={lowStockColumns} data={items} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
const lowStockColumns = [
  { key: "productCode", label: "Code" },
  { key: "productName", label: "Product" },
  { key: "productType", label: "Type" },
  {
    key: "available",
    label: "Available",
    render: (row) => (
      <Badge variant={row.isCritical ? "danger" : "warning"}>
        {row.available}
        {row.isCritical ? " (critical)" : ""}
      </Badge>
    ),
  },
  { key: "reorderLevel", label: "Reorder At" },
  { key: "minimumStock", label: "Min Stock" },
  { key: "shortage", label: "Shortage" },
];

export function StockMovementReport() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today());
  const { data, isLoading } = useStockMovement({
    startDate,
    endDate,
    limit: 500,
  });
  const rows = data?.data || [];
  return (
    <div>
      <ReportHeader
        title="Stock Movement Log"
        description="All inventory changes audit trail"
      />
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
      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : !rows.length ? (
          <div className="py-16 text-center text-gray-500">
            No movements in this period
          </div>
        ) : (
          <Table
            columns={[
              {
                key: "createdAt",
                label: "Date",
                render: (row) => new Date(row.createdAt).toLocaleString(),
              },
              {
                key: "movementNumber",
                label: "Ref",
                render: (row) => row.movementNumber || "—",
              },
              {
                key: "product",
                label: "Product",
                render: (row) =>
                  row.productId?.name || row.productName || "—",
              },
              {
                key: "warehouse",
                label: "Warehouse",
                render: (row) => row.warehouseId?.name || "—",
              },
              {
                key: "movementType",
                label: "Type",
                render: (row) => row.movementType?.replace(/_/g, " "),
              },
              {
                key: "direction",
                label: "Direction",
                render: (row) =>
                  row.direction === "in" ? "↑ IN" : "↓ OUT",
              },
              { key: "quantity", label: "Quantity" },
              { key: "balanceAfter", label: "Balance" },
              {
                key: "source",
                label: "Source",
                render: (row) => row.sourceDocument?.number || "—",
              },
              {
                key: "performedBy",
                label: "Performed By",
                render: (row) =>
                  row.performedBy
                    ? `${row.performedBy.firstName} ${row.performedBy.lastName}`
                    : "—",
              },
            ]}
            data={rows}
          />
        )}
      </Card>
    </div>
  );
}

export function SlowFastMoversReport() {
  const [days, setDays] = useState(90);
  const [classFilter, setClassFilter] = useState("all");
  const { data, isLoading } = useSlowFastMovers({ days });
  const report = data?.data;
  const rows = report
    ? Object.entries(report.classification)
        .filter(([key]) => classFilter === "all" || key === classFilter)
        .flatMap(([, values]) => values)
    : [];
  return (
    <div>
      <ReportHeader
        title="Slow & Fast Movers (ABC Analysis)"
        description="Products classified by revenue contribution"
      />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <Input
            className="w-32"
            label="Days"
            type="number"
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
          <Select
            className="w-40"
            label="Class"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            options={[
              { value: "all", label: "All classes" },
              { value: "A", label: "A - Fast" },
              { value: "B", label: "B - Medium" },
              { value: "C", label: "C - Slow" },
              { value: "D", label: "D - Dead stock" },
            ]}
          />
        </div>
      </Card>
      {isLoading || !report ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Summary label="Fast Movers" value={report.summary.fastMovers} />
            <Summary
              label="Medium Movers"
              value={report.summary.mediumMovers}
            />
            <Summary label="Slow Movers" value={report.summary.slowMovers} />
            <Summary label="Dead Stock" value={report.summary.deadStock} />
          </div>
          <Card>
            <Table
              columns={[
                { key: "productCode", label: "Code" },
                { key: "productName", label: "Product" },
                { key: "unitsSold", label: "Units Sold" },
                {
                  key: "revenue",
                  label: "Revenue",
                  render: (row) => money(row.revenue),
                },
                {
                  key: "cumulativePercent",
                  label: "Cumulative %",
                  render: (row) =>
                    row.cumulativePercent ? `${row.cumulativePercent}%` : "—",
                },
                {
                  key: "abcClass",
                  label: "Class",
                  render: (row) => <Badge>{row.abcClass}</Badge>,
                },
              ]}
              data={rows}
            />
          </Card>
        </>
      )}
    </div>
  );
}

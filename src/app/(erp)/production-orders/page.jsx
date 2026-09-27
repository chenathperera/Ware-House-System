"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Factory, Plus, Search } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useProductionOrders } from "../../../client/features/production/useProduction.js";
import { useAuthStore } from "../../../client/store/authStore.js";

const statusVariant = {
  draft: "default",
  planned: "info",
  materials_reserved: "info",
  in_progress: "warning",
  on_hold: "warning",
  completed: "success",
  partially_completed: "warning",
  cancelled: "danger",
  closed: "default",
};
const priorityVariant = {
  low: "default",
  normal: "info",
  high: "warning",
  urgent: "danger",
};
const formatMoney = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function ProductionOrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canCreate = ["admin", "manager", "production_staff"].includes(
    user?.role,
  );
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    page: 1,
    limit: 15,
  });
  const { data, isLoading } = useProductionOrders(filters);
  const orders = data?.data || [];
  const updateFilter = (field, value) =>
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  const columns = [
    {
      key: "productionNumber",
      label: "Prod #",
      width: "130px",
      render: (row) => (
        <span className="font-mono text-xs">{row.productionNumber}</span>
      ),
    },
    {
      key: "finishedProduct",
      label: "Making",
      render: (row) => (
        <div>
          <p className="font-medium">{row.finishedProductName}</p>
          <p className="text-xs text-gray-500">
            {row.bomName} · {row.bomCode}
          </p>
        </div>
      ),
    },
    {
      key: "qty",
      label: "Qty",
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium">{row.plannedQuantity}</p>
          {row.totalProduced > 0 && row.totalProduced < row.plannedQuantity && (
            <p className="text-xs text-green-600">{row.totalProduced} done</p>
          )}
        </div>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primary-500"
              style={{ width: `${row.completionPercent || 0}%` }}
            />
          </div>
          <span className="text-xs">
            {Math.round(row.completionPercent || 0)}%
          </span>
        </div>
      ),
    },
    {
      key: "plannedStart",
      label: "Start",
      render: (row) => formatDate(row.plannedStartDate),
    },
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <Badge variant={priorityVariant[row.priority]}>{row.priority}</Badge>
      ),
    },
    {
      key: "cost",
      label: "Est. Cost",
      render: (row) => formatMoney(row.totalPlannedCost),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>
          {row.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "50px",
      render: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/production-orders/${row._id}`);
          }}
          className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Production Orders"
        description="Manufacture finished goods from raw materials"
        actions={
          canCreate && (
            <Button
              variant="primary"
              onClick={() => router.push("/production-orders/new")}
            >
              <Plus size={16} className="mr-1.5" /> New Production Order
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by production #, product or BOM..."
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              placeholder="All Statuses"
              options={[
                { value: "draft", label: "Draft" },
                { value: "planned", label: "Planned" },
                { value: "in_progress", label: "In Progress" },
                { value: "on_hold", label: "On Hold" },
                { value: "completed", label: "Completed" },
                { value: "partially_completed", label: "Partially Completed" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              placeholder="All Priorities"
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
              value={filters.priority}
              onChange={(event) => updateFilter("priority", event.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="No production orders"
            description="Create one from a BOM to start manufacturing"
            action={
              canCreate && (
                <Button
                  variant="primary"
                  onClick={() => router.push("/production-orders/new")}
                >
                  <Plus size={16} className="mr-1.5" /> New Production Order
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={orders}
              onRowClick={(row) => router.push(`/production-orders/${row._id}`)}
            />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              onPageChange={(page) =>
                setFilters((current) => ({ ...current, page }))
              }
            />
          </>
        )}
      </Card>
    </div>
  );
}

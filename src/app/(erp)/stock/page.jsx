"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  PackagePlus,
  Search,
  Settings2,
} from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { useAuthStore } from "../../../client/store/authStore.js";
import { useWarehouses } from "../../../client/features/warehouses/useWarehouses.js";
import { useStockItems } from "../../../client/features/stock/useStock.js";

const number = (value) =>
  new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2 }).format(
    value || 0,
  );
const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

function stockStatus(item) {
  const onHand = item.quantities.onHand;
  const reorder = item.productId?.stockLevels?.reorderLevel || 0;
  const minimum = item.productId?.stockLevels?.minimumLevel || 0;
  if (onHand <= 0) return { variant: "danger", label: "Out of stock" };
  if (onHand <= minimum) return { variant: "danger", label: "Critical" };
  if (reorder && onHand <= reorder) return { variant: "warning", label: "Low" };
  return { variant: "success", label: "In stock" };
}

export default function StockPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canAdjust = ["admin", "manager", "warehouse_staff"].includes(
    user?.role,
  );
  const [filters, setFilters] = useState({
    search: "",
    warehouseId: "",
    lowStock: "",
    page: 1,
    limit: 20,
  });
  const { data, isLoading } = useStockItems(filters);
  const { data: warehousesData } = useWarehouses();
  const items = data?.data || [];
  const warehouses = (warehousesData?.data || []).map((warehouse) => ({
    value: warehouse._id,
    label: `${warehouse.name} (${warehouse.warehouseCode})`,
  }));
  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.productName}</p>
          <p className="font-mono text-xs text-gray-500">{row.productCode}</p>
        </div>
      ),
    },
    {
      key: "warehouse",
      label: "Warehouse",
      render: (row) => (
        <div>
          <p className="text-sm">{row.warehouseId?.name}</p>
          <p className="font-mono text-xs text-gray-500">
            {row.warehouseId?.warehouseCode}
          </p>
        </div>
      ),
    },
    {
      key: "onHand",
      label: "On Hand",
      render: (row) => (
        <span className="font-medium">
          {number(row.quantities.onHand)} {row.unitOfMeasure}
        </span>
      ),
    },
    {
      key: "reserved",
      label: "Reserved",
      render: (row) => (
        <span
          className={
            row.quantities.reserved > 0 ? "text-amber-600" : "text-gray-400"
          }
        >
          {number(row.quantities.reserved)}
        </span>
      ),
    },
    {
      key: "available",
      label: "Available",
      render: (row) => (
        <span className="font-medium text-green-700">
          {number(row.quantities.onHand - row.quantities.reserved)}
        </span>
      ),
    },
    {
      key: "unitCost",
      label: "Unit Cost",
      render: (row) => {
        const cost =
          row.costPerUnit ||
          row.productId?.costs?.averageCost ||
          row.productId?.costs?.standardCost ||
          row.productId?.purchasePrice ||
          0;
        return cost > 0 ? (
          <span className="text-sm font-medium text-gray-700">
            {money(cost)}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        );
      },
    },
    {
      key: "value",
      label: "Stock Value",
      render: (row) => (
        <span className="text-sm font-semibold text-indigo-700">
          {money(row.totalValue)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = stockStatus(row);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
  ];
  const pageValue = items.reduce(
    (total, item) => total + (item.totalValue || 0),
    0,
  );
  const update = (change) =>
    setFilters((current) => ({ ...current, ...change, page: 1 }));

  return (
    <div>
      <PageHeader
        title="Stock Overview"
        description="Current inventory across all warehouses"
        actions={
          canAdjust && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/stock/opening")}
              >
                <PackagePlus size={16} className="mr-1.5" /> Opening Stock
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/stock/transfer")}
              >
                <ArrowRightLeft size={16} className="mr-1.5" /> Transfer
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/stock/adjustment")}
              >
                <Settings2 size={16} className="mr-1.5" /> Adjust
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/stock/movements")}
              >
                History
              </Button>
            </div>
          )
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-semibold">{data?.total || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Value (page)</p>
          <p className="text-2xl font-semibold">{money(pageValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Warehouses</p>
          <p className="text-2xl font-semibold">{warehouses.length}</p>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-1 text-sm text-amber-700">
            <AlertTriangle size={14} /> Low stock
          </p>
          <button
            className="text-2xl font-semibold text-amber-700 hover:underline"
            onClick={() => update({ lowStock: "true" })}
          >
            View
          </button>
        </Card>
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search product..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
            />
          </div>
          <div className="w-56">
            <Select
              placeholder="All Warehouses"
              options={warehouses}
              value={filters.warehouseId}
              onChange={(event) => update({ warehouseId: event.target.value })}
            />
          </div>
          <div className="w-40">
            <Select
              placeholder="All Items"
              options={[{ value: "true", label: "Low stock only" }]}
              value={filters.lowStock}
              onChange={(event) => update({ lowStock: event.target.value })}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No stock data"
            description="Enter opening stock to get started"
            action={
              canAdjust && (
                <Button
                  variant="primary"
                  onClick={() => router.push("/stock/opening")}
                >
                  <PackagePlus size={16} className="mr-1.5" /> Enter Opening
                  Stock
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={columns} data={items} />
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

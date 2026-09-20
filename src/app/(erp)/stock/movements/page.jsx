"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import EmptyState from "../../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Pagination from "../../../../components/ui/Pagination.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Table from "../../../../components/ui/Table.jsx";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";
import { useStockMovements } from "../../../../client/features/stock/useStock.js";

const labels = { opening_stock: "Opening Stock", purchase_receipt: "Purchase", sale_dispatch: "Sale", sale_return: "Return", transfer_out: "Transfer Out", transfer_in: "Transfer In", adjustment_in: "Adjustment (+)", adjustment_out: "Adjustment (−)", damage: "Damage" };
const variants = { in: "success", out: "warning" };
const formatQuantity = (value) => new Intl.NumberFormat("en-LK").format(value || 0);
const formatDate = (value) => new Date(value).toLocaleString("en-LK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function StockMovementsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ movementType: "", warehouseId: "", page: 1, limit: 25 });
  const { data, isLoading } = useStockMovements(filters);
  const { data: warehousesData } = useWarehouses();
  const movements = data?.data || [];
  const warehouseOptions = (warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }));
  const change = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  const columns = [
    { key: "movementNumber", label: "Ref #", width: "120px", render: (row) => <span className="font-mono text-xs">{row.movementNumber}</span> },
    { key: "timestamp", label: "Date", render: (row) => <span className="text-xs">{formatDate(row.timestamp)}</span> },
    { key: "product", label: "Product", render: (row) => <div><p className="text-sm font-medium">{row.productName}</p><p className="font-mono text-xs text-gray-500">{row.productCode}</p></div> },
    { key: "type", label: "Type", render: (row) => <div className="flex items-center gap-1.5"><Badge variant={variants[row.direction]}>{row.direction.toUpperCase()}</Badge><span className="text-xs">{labels[row.movementType] || row.movementType}</span></div> },
    { key: "qty", label: "Qty", render: (row) => <span className={`font-medium ${row.direction === "in" ? "text-green-600" : "text-red-600"}`}>{row.direction === "in" ? "+" : "−"}{formatQuantity(row.quantity)} {row.unitOfMeasure}</span> },
    { key: "warehouse", label: "Warehouse", render: (row) => row.movementType === "transfer_out" ? `${row.warehouseId?.name} → …` : row.movementType === "transfer_in" ? `… → ${row.warehouseId?.name}` : row.warehouseId?.name || "—" },
    { key: "balance", label: "Balance", render: (row) => <span className="text-sm">{formatQuantity(row.balanceAfter)}</span> },
    { key: "ref", label: "Ref", render: (row) => row.sourceDocument?.number ? <span className="font-mono text-xs text-gray-600">{row.sourceDocument.number}</span> : <span className="text-gray-400">—</span> },
    { key: "by", label: "By", render: (row) => row.performedBy ? `${row.performedBy.firstName} ${row.performedBy.lastName}` : "—" },
  ];
  return <div><PageHeader title="Stock Movements" description="Complete audit trail of every stock change" actions={<Button variant="outline" onClick={() => router.push("/stock")}><ArrowLeft size={16} className="mr-1.5" /> Back to Stock</Button>} /><Card><div className="flex flex-wrap gap-3 border-b border-gray-200 p-4"><div className="w-56"><Select placeholder="All Types" options={Object.entries(labels).map(([value, label]) => ({ value, label }))} value={filters.movementType} onChange={(event) => change("movementType", event.target.value)} /></div><div className="w-56"><Select placeholder="All Warehouses" options={warehouseOptions} value={filters.warehouseId} onChange={(event) => change("warehouseId", event.target.value)} /></div></div>{isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : movements.length === 0 ? <EmptyState icon={History} title="No movements yet" description="Stock movements appear here as they happen" /> : <><Table columns={columns} data={movements} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>}</Card></div>;
}

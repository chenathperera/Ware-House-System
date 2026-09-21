"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Eye, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { useAuthStore } from "../../../client/store/authStore.js";
import { useDeletePurchaseOrder, usePurchaseOrders } from "../../../client/features/purchaseOrders/usePurchaseOrders.js";

const variants = { draft: "default", pending_approval: "warning", approved: "info", sent: "info", partially_received: "warning", fully_received: "success", closed: "success", cancelled: "danger" };
const statuses = ["draft", "approved", "sent", "partially_received", "fully_received", "closed", "cancelled"].map((value) => ({ value, label: value.replaceAll("_", " ") }));
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function PurchaseOrdersPage() {
  const router = useRouter(); const { user } = useAuthStore(); const canCreate = ["admin", "manager", "accountant"].includes(user?.role);
  const [filters, setFilters] = useState({ search: "", status: "", page: 1, limit: 10 });
  const { data, isLoading } = usePurchaseOrders(filters); const remove = useDeletePurchaseOrder(); const orders = data?.data || [];
  const update = (change) => setFilters((current) => ({ ...current, ...change, page: 1 }));
  const columns = [{ key: "poNumber", label: "PO #", render: (row) => <span className="font-mono text-xs">{row.poNumber}</span> }, { key: "poDate", label: "Date", render: (row) => new Date(row.poDate).toLocaleDateString("en-LK") }, { key: "supplier", label: "Supplier", render: (row) => <div><p className="font-medium">{row.supplierSnapshot?.name}</p><p className="text-xs text-gray-500">{row.supplierSnapshot?.code}</p></div> }, { key: "warehouse", label: "Deliver To", render: (row) => row.deliverTo?.warehouseName || "—" }, { key: "items", label: "Items", render: (row) => row.items?.length || 0 }, { key: "grandTotal", label: "Total", render: (row) => <span className="font-medium">{money(row.grandTotal)}</span> }, { key: "receipt", label: "Received", render: (row) => <span>{Math.round(row.receiptCompletionPercent || 0)}%</span> }, { key: "status", label: "Status", render: (row) => <Badge variant={variants[row.status]}>{row.status.replace("_", " ")}</Badge> }, { key: "actions", label: "", render: (row) => <div className="flex justify-end gap-1"><button title="View" onClick={(event) => { event.stopPropagation(); router.push(`/purchase-orders/${row._id}`); }}><Eye size={16} /></button>{["draft", "pending_approval"].includes(row.status) && <button title="Edit" onClick={(event) => { event.stopPropagation(); router.push(`/purchase-orders/${row._id}/edit`); }}><Edit size={16} /></button>}{row.status === "draft" && <button title="Delete" disabled={remove.isPending} onClick={(event) => { event.stopPropagation(); if (window.confirm("Delete this draft PO?")) remove.mutate(row._id); }}><Trash2 size={16} /></button>}</div> }];
  return <div><PageHeader title="Purchase Orders" description="Buy stock from suppliers" actions={canCreate && <Button variant="primary" onClick={() => router.push("/purchase-orders/new")}><Plus size={16} className="mr-1.5" /> New PO</Button>} /><Card><div className="flex flex-wrap gap-3 border-b border-gray-200 p-4"><div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-3 text-gray-400" /><input placeholder="Search by PO number or supplier..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" value={filters.search} onChange={(event) => update({ search: event.target.value })} /></div><div className="w-56"><Select placeholder="All Statuses" options={statuses} value={filters.status} onChange={(event) => update({ status: event.target.value })} /></div></div>{isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : orders.length === 0 ? <EmptyState icon={ShoppingBag} title="No purchase orders" description="Create your first PO" action={canCreate && <Button variant="primary" onClick={() => router.push("/purchase-orders/new")}><Plus size={16} className="mr-1.5" /> New PO</Button>} /> : <><Table columns={columns} data={orders} onRowClick={(row) => router.push(`/purchase-orders/${row._id}`)} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>}</Card></div>;
}

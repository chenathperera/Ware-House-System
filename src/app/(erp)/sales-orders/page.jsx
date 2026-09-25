"use client";
import { useState } from "react";
import Link from "next/link";
import { Edit, Eye, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useAuthStore } from "../../../client/store/authStore.js";
import { useDeleteSalesOrder, useSalesOrders } from "../../../client/features/salesOrders/useSalesOrders.js";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
const variants = { draft: "default", pending_approval: "warning", approved: "info", partially_dispatched: "info", dispatched: "info", partially_delivered: "info", delivered: "success", invoiced: "success", completed: "success", on_hold: "warning", cancelled: "danger" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
export default function SalesOrdersPage() {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({ search: "", status: "", page: 1, limit: 10 });
  const { data, isLoading } = useSalesOrders(filters);
  const remove = useDeleteSalesOrder();
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
  const orders = data?.data || [];
  const canCreate = ["admin", "manager", "sales_manager", "sales_rep"].includes(user?.role);
  const columns = [
    { key: "orderNumber", label: "Order #", render: (row) => <span className="font-mono text-xs">{row.orderNumber}</span> },
    { key: "orderDate", label: "Date", render: (row) => new Date(row.orderDate).toLocaleDateString("en-LK") },
    { key: "customer", label: "Customer", render: (row) => <div><p className="font-medium text-gray-900">{row.customerSnapshot?.name}</p><p className="text-xs text-gray-500">{row.customerSnapshot?.code}</p></div> },
    { key: "items", label: "Items", render: (row) => row.items?.length || 0 },
    { key: "grandTotal", label: "Total", render: (row) => <span className="font-medium">{money(row.grandTotal)}</span> },
    { key: "salesRep", label: "Sales Rep", render: (row) => row.salesRepId ? `${row.salesRepId.firstName} ${row.salesRepId.lastName}` : "—" },
    { key: "status", label: "Status", render: (row) => <Badge variant={variants[row.status]}>{row.status.replace("_", " ")}</Badge> },
    { key: "actions", label: "", render: (row) => <div className="flex justify-end gap-1"><Link href={`/sales-orders/${row._id}`} className="rounded p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600"><Eye size={16} /></Link>{["draft", "pending_approval"].includes(row.status) && <Link href={`/sales-orders/${row._id}/edit`} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Edit size={16} /></Link>}{row.status === "draft" && <button type="button" title="Delete" disabled={remove.isPending} onClick={() => window.confirm("Delete this draft order?") && remove.mutate(row._id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>}</div> },
  ];
  return <div><PageHeader title="Sales Orders" description="Manage customer orders" actions={canCreate && <div className="flex gap-2"><Link href="/pos"><Button variant="outline"><ShoppingCart size={16} className="mr-1.5" />POS Mode</Button></Link><Link href="/sales-orders/new"><Button variant="primary"><Plus size={16} className="mr-1.5" />Detailed Order</Button></Link></div>} /><Card><div className="flex flex-wrap gap-3 border-b p-4"><div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input className="pl-9" placeholder="Search by order number or customer..." value={filters.search} onChange={(event) => update("search", event.target.value)} /></div><Select className="w-48" placeholder="All Statuses" options={["draft", "pending_approval", "approved", "dispatched", "delivered", "completed", "on_hold", "cancelled"].map((value) => ({ value, label: value.replace("_", " ") }))} value={filters.status} onChange={(event) => update("status", event.target.value)} /></div>{isLoading ? <div className="py-16 text-center text-gray-500">Loading orders...</div> : orders.length === 0 ? <EmptyState icon={ShoppingCart} title="No orders yet" description="Create your first sales order" action={canCreate && <Link href="/sales-orders/new"><Button variant="primary"><Plus size={16} className="mr-1.5" />New Order</Button></Link>} /> : <><Table columns={columns} data={orders} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => update("page", page)} /></>}</Card></div>;
}

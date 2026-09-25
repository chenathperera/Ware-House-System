"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Plus, RotateCcw, Search } from "lucide-react";
import { useAuthStore } from "../../../client/store/authStore.js";
import { useReturns } from "../../../client/features/returns/useReturns.js";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";

const variants = { draft: "default", approved: "info", awaiting_return: "info", received: "warning", inspecting: "warning", processed: "warning", completed: "success", rejected: "danger", cancelled: "default" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function ReturnsPage() {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({ search: "", status: "", page: 1, limit: 15 });
  const { data, isLoading } = useReturns(filters);
  const returns = data?.data || [];
  const canCreate = ["admin", "manager", "sales_manager", "sales_rep", "accountant"].includes(user?.role);
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
  const columns = [{ key: "rmaNumber", label: "RMA #", render: (row) => <span className="font-mono text-xs">{row.rmaNumber}</span> }, { key: "requestDate", label: "Date", render: (row) => new Date(row.requestDate).toLocaleDateString("en-LK") }, { key: "customer", label: "Customer", render: (row) => <div><p className="font-medium">{row.customerSnapshot?.name}</p><p className="text-xs text-gray-500">{row.customerSnapshot?.code}</p></div> }, { key: "items", label: "Items", render: (row) => row.items?.length || 0 }, { key: "totalReturnValue", label: "Return Value", render: (row) => money(row.totalReturnValue) }, { key: "netRefundAmount", label: "Refund", render: (row) => money(row.netRefundAmount) }, { key: "status", label: "Status", render: (row) => <Badge variant={variants[row.status]}>{row.status.replace(/_/g, " ")}</Badge> }, { key: "view", label: "", render: (row) => <Link href={`/returns/${row._id}`} className="p-1.5 text-gray-500"><Eye size={16} /></Link> }];
  return <div><PageHeader title="Customer Returns (RMA)" description="Manage return requests and restocking" actions={canCreate && <Link href="/returns/new"><Button variant="primary"><Plus size={16} className="mr-1.5" />New Return</Button></Link>} /><Card><div className="flex gap-3 border-b p-4"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input className="pl-9" placeholder="Search..." value={filters.search} onChange={(event) => update("search", event.target.value)} /></div><Select className="w-56" placeholder="All Statuses" options={["draft", "approved", "received", "processed", "completed", "rejected"].map((value) => ({ value, label: value.replace(/_/g, " ") }))} value={filters.status} onChange={(event) => update("status", event.target.value)} /></div>{isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : returns.length === 0 ? <EmptyState icon={RotateCcw} title="No returns yet" description="Create an RMA when a customer wants to return goods" /> : <><Table columns={columns} data={returns} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => update("page", page)} /></>}</Card></div>;
}

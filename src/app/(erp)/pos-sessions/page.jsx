"use client";
import { useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { usePosSessions } from "../../../client/features/posSessions/usePosSessions.js";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Table from "../../../components/ui/Table.jsx";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value || 0);
const dateTime = (value) => value ? new Date(value).toLocaleString("en-LK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function PosSessionsPage() {
  const [filters, setFilters] = useState({ startDate: "", endDate: "", page: 1, limit: 15 });
  const { data, isLoading, refetch } = usePosSessions(filters);
  const sessions = data?.data || [];
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
  const columns = [
    { key: "cashier", label: "Cashier", render: (row) => `${row.userId?.firstName || ""} ${row.userId?.lastName || ""}`.trim() || "Unknown User" },
    { key: "status", label: "Status", render: (row) => <Badge variant={row.status === "open" ? "success" : "default"}>{row.status}</Badge> },
    { key: "openedAt", label: "Opened At", render: (row) => dateTime(row.openedAt) },
    { key: "closedAt", label: "Closed At", render: (row) => row.closedAt ? dateTime(row.closedAt) : "Active Session" },
    { key: "openingBalance", label: "Opening Bal", render: (row) => money(row.openingBalance) },
    { key: "cashSales", label: "Cash Sales", render: (row) => `+${money(row.cashSales)}` },
    { key: "cashExpenses", label: "Cash Exp", render: (row) => `-${money(row.cashExpenses)}` },
    { key: "expected", label: "Expected Bal", render: (row) => money((row.openingBalance || 0) + (row.cashSales || 0) - (row.cashExpenses || 0)) },
    { key: "actual", label: "Actual Bal", render: (row) => row.status === "closed" ? money(row.actualClosingBalance) : "Open Register" },
    { key: "difference", label: "Discrepancy", render: (row) => row.status === "closed" ? money((row.actualClosingBalance || 0) - ((row.openingBalance || 0) + (row.cashSales || 0) - (row.cashExpenses || 0))) : "—" },
  ];
  return <div><PageHeader title="POS Sessions" description="Monitor active and closed cashier register sessions, cash flows, and balance discrepancies." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => refetch()}><RefreshCw size={16} className="mr-1.5" />Refresh</Button><Link href="/pos"><Button variant="primary">Open POS Terminal</Button></Link></div>} /><Card className="mb-6 p-4"><div className="grid gap-4 md:grid-cols-2"><Input label="Start Date" type="date" value={filters.startDate} onChange={(event) => update("startDate", event.target.value)} /><Input label="End Date" type="date" value={filters.endDate} onChange={(event) => update("endDate", event.target.value)} /></div></Card><Card>{isLoading ? <div className="py-16 text-center text-gray-500">Loading sessions...</div> : sessions.length === 0 ? <EmptyState title="No POS Sessions Found" description="There are no register histories matching your filters." /> : <><Table columns={columns} data={sessions} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => update("page", page)} /></>}</Card></div>;
}

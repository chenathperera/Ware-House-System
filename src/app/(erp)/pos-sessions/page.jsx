"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  RefreshCw,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import { usePosSessions } from "../../../client/features/posSessions/usePosSessions.js";
import { usersApi } from "../../../client/features/users/usersApi.js";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value || 0);
const dateTime = (value) =>
  value ? new Date(value).toLocaleString("en-LK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const expectedBalance = (session) => (session.openingBalance || 0) + (session.cashSales || 0) - (session.cashExpenses || 0);

export default function PosSessionsPage() {
  const [filters, setFilters] = useState({ userId: "", startDate: "", endDate: "", page: 1, limit: 15 });
  const { data: usersData } = useQuery({
    queryKey: ["users", { isActive: true, limit: 100 }],
    queryFn: () => usersApi.list({ isActive: true, limit: 100 }),
  });
  const { data, isLoading, refetch } = usePosSessions({
    ...filters,
    userId: filters.userId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });
  const sessions = data?.data || [];
  const users = usersData?.data || [];
  const hasFilters = filters.userId || filters.startDate || filters.endDate;
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
  const clearFilters = () => setFilters({ userId: "", startDate: "", endDate: "", page: 1, limit: 15 });
  const activeRegisters = sessions.filter((session) => session.status === "open").length;
  const cashSales = sessions.reduce((total, session) => total + (session.cashSales || 0), 0);
  const cashExpenses = sessions.reduce((total, session) => total + (session.cashExpenses || 0), 0);
  const discrepancies = sessions.reduce((total, session) => session.status === "open" ? total : total + (session.actualClosingBalance || 0) - expectedBalance(session), 0);

  const columns = [
    { key: "cashier", label: "Cashier", render: (row) => <Cashier user={row.userId} /> },
    { key: "status", label: "Status", render: (row) => <Badge variant={row.status === "open" ? "success" : "secondary"} className="capitalize">{row.status}</Badge> },
    { key: "openedAt", label: "Opened At", render: (row) => <Time value={dateTime(row.openedAt)} /> },
    { key: "closedAt", label: "Closed At", render: (row) => <Time value={row.closedAt ? dateTime(row.closedAt) : "Active Session"} /> },
    { key: "openingBalance", label: "Opening Bal", render: (row) => <span className="font-mono text-xs">{money(row.openingBalance)}</span> },
    { key: "cashSales", label: "Cash Sales", render: (row) => <span className="font-mono text-xs font-medium text-emerald-600">+{money(row.cashSales)}</span> },
    { key: "cashExpenses", label: "Cash Exp", render: (row) => <span className="font-mono text-xs font-medium text-red-500">-{money(row.cashExpenses)}</span> },
    { key: "expectedClosing", label: "Expected Bal", render: (row) => <span className="font-mono text-xs font-semibold">{money(expectedBalance(row))}</span> },
    { key: "actualClosing", label: "Actual Bal", render: (row) => row.status === "closed" ? <span className="font-mono text-xs font-semibold">{money(row.actualClosingBalance)}</span> : <span className="text-xs italic text-gray-400">Open Register</span> },
    { key: "difference", label: "Discrepancy", render: (row) => <Discrepancy session={row} /> },
    { key: "notes", label: "Notes", render: (row) => <span className="block max-w-[200px] truncate text-xs text-gray-500" title={row.notes}>{row.notes || "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="POS Sessions"
        description="Monitor active and closed cashier register sessions, cash flows, and balance discrepancies."
        actions={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => refetch()} className="shadow-sm"><RefreshCw size={14} className="mr-1" /> Refresh</Button><Link href="/pos"><Button variant="primary" size="sm" className="bg-indigo-600 shadow-md hover:bg-indigo-700">Open POS Terminal</Button></Link></div>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard icon={Clock} iconClassName="bg-indigo-50 text-indigo-600" label="Active Registers" value={activeRegisters} />
        <SummaryCard icon={ArrowUpRight} iconClassName="bg-emerald-50 text-emerald-600" label="Total Cash Sales" value={money(cashSales)} valueClassName="text-emerald-600" />
        <SummaryCard icon={ArrowDownRight} iconClassName="bg-rose-50 text-rose-600" label="Total Cash Expenses" value={money(cashExpenses)} valueClassName="text-rose-600" />
        <SummaryCard icon={ShieldAlert} iconClassName="bg-amber-50 text-amber-600" label="Total Discrepancies" value={money(discrepancies)} valueClassName="text-amber-700" />
      </div>

      <Card className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-[200px] flex-1"><Select label="Cashier" value={filters.userId} onChange={(event) => update("userId", event.target.value)} options={[{ value: "", label: "All Cashiers" }, ...users.map((user) => ({ value: user._id, label: `${user.firstName || ""} ${user.lastName || ""} (${user.email})` }))]} /></div>
          <div className="min-w-[150px] flex-1"><Input label="Start Date" type="date" value={filters.startDate} onChange={(event) => update("startDate", event.target.value)} /></div>
          <div className="min-w-[150px] flex-1"><Input label="End Date" type="date" value={filters.endDate} onChange={(event) => update("endDate", event.target.value)} /></div>
          {hasFilters && <Button variant="outline" onClick={clearFilters} className="h-10 px-4"><X size={14} className="mr-1" /> Clear</Button>}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md">
        {isLoading ? <div className="flex items-center justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" /></div> : sessions.length === 0 ? <EmptyState title="No POS Sessions Found" description="There are no register histories matching your filters." icon={Clock} /> : <><div className="overflow-x-auto"><Table columns={columns} data={sessions} /></div><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => update("page", page)} /></>}
      </Card>
    </div>
  );
}

function Cashier({ user }) {
  const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown User";
  return <div className="flex items-center gap-2"><div className="rounded-full bg-indigo-50 p-1.5 text-indigo-700"><User size={14} /></div><span className="font-semibold text-gray-900">{name}</span></div>;
}

function Time({ value }) {
  return <div className="flex items-center gap-1.5 text-xs text-gray-500"><Clock size={12} /><span>{value}</span></div>;
}

function Discrepancy({ session }) {
  if (session.status === "open") return <span className="text-xs text-gray-400">—</span>;
  const difference = (session.actualClosingBalance || 0) - expectedBalance(session);
  if (difference === 0) return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">Balanced</span>;
  const isOver = difference > 0;
  return <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${isOver ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{isOver ? "+" : ""}{money(difference)}</span>;
}

function SummaryCard({ icon: Icon, iconClassName, label, value, valueClassName = "text-gray-900" }) {
  return <Card className="flex items-center gap-4 border border-gray-100 bg-white p-4 shadow-sm"><div className={`rounded-lg p-3 ${iconClassName}`}><Icon size={24} /></div><div><p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p><p className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</p></div></Card>;
}

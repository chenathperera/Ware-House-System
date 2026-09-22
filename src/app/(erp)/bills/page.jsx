"use client";

import { useState } from "react";
import { Eye, Receipt as ReceiptIcon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { useBills, usePayablesAging } from "../../../client/features/bills/useBills.js";

const statusVariant = { unpaid: "warning", partially_paid: "info", paid: "success", overdue: "danger", cancelled: "default", disputed: "danger" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const date = (value) => value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function BillsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ search: "", paymentStatus: "", agingBucket: "", page: 1, limit: 15 });
  const { data, isLoading } = useBills(filters);
  const { data: agingData } = usePayablesAging();
  const bills = data?.data || [];
  const aging = agingData?.data || { buckets: {}, counts: {}, totalPayable: 0 };
  const columns = [
    { key: "billNumber", label: "Bill #", width: "120px", render: (row) => <span className="font-mono text-xs">{row.billNumber}</span> },
    { key: "supplierInvoice", label: "Supplier Inv #", render: (row) => row.supplierInvoiceNumber || "—" },
    { key: "billDate", label: "Date", render: (row) => date(row.billDate) },
    { key: "supplier", label: "Supplier", render: (row) => <div><p className="font-medium">{row.supplierSnapshot?.name}</p><p className="text-xs text-gray-500">{row.supplierSnapshot?.code}</p></div> },
    { key: "dueDate", label: "Due", render: (row) => date(row.dueDate) },
    { key: "grandTotal", label: "Total", render: (row) => money(row.grandTotal) },
    { key: "balance", label: "We Owe", render: (row) => row.balanceDue > 0 ? <span className="font-medium text-red-600">{money(row.balanceDue)}</span> : <span className="text-green-600">Paid</span> },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant[row.paymentStatus]}>{row.paymentStatus.replace("_", " ")}</Badge> },
    { key: "actions", label: "", width: "50px", render: (row) => <button onClick={() => router.push(`/bills/${row._id}`)} className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"><Eye size={16} /></button> },
  ];
  const agingCards = [
    ["current", "Current", "bg-green-50 text-green-700 border-green-200"],
    ["1_30", "1-30 days", "bg-yellow-50 text-yellow-700 border-yellow-200"],
    ["31_60", "31-60 days", "bg-orange-50 text-orange-700 border-orange-200"],
    ["61_90", "61-90 days", "bg-red-50 text-red-700 border-red-200"],
    ["91_plus", "90+ days", "bg-red-100 text-red-800 border-red-300"],
  ];

  return <div>
    <PageHeader title="Supplier Bills" description="Track what you owe suppliers" />
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
      {agingCards.map(([key, label, color]) => <button key={key} onClick={() => setFilters((current) => ({ ...current, agingBucket: key, page: 1 }))} className={`rounded-lg border p-3 text-left ${color} ${filters.agingBucket === key ? "ring-2 ring-primary-500 ring-offset-1" : ""}`}><p className="text-xs">{label}</p><p className="text-lg font-bold">{money(aging.buckets?.[key] || 0)}</p><p className="text-xs opacity-75">{aging.counts?.[key] || 0}</p></button>)}
    </div>
    <Card>
      <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
        <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} /></div>
        <div className="w-48"><Select placeholder="All Statuses" options={[{ value: "unpaid", label: "Unpaid" }, { value: "partially_paid", label: "Partially Paid" }, { value: "paid", label: "Paid" }, { value: "overdue", label: "Overdue" }, { value: "disputed", label: "Disputed" }, { value: "cancelled", label: "Cancelled" }]} value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value, page: 1 }))} /></div>
        {filters.agingBucket && <Button variant="outline" size="sm" onClick={() => setFilters((current) => ({ ...current, agingBucket: "" }))}>Clear filter</Button>}
      </div>
      {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : bills.length === 0 ? <EmptyState icon={ReceiptIcon} title="No bills yet" description="Bills are generated from GRNs when goods arrive" /> : <><Table columns={columns} data={bills} onRowClick={(row) => router.push(`/bills/${row._id}`)} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>}
    </Card>
  </div>;
}

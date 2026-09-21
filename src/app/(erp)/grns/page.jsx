"use client";

import { useState } from "react";
import { PackageCheck, Plus, Search, Trash2 } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Table from "../../../components/ui/Table.jsx";
import DirectGrnModal from "../../../client/features/grns/DirectGrnModal.jsx";
import { useCancelGrn, useGrns } from "../../../client/features/grns/useGrns.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value || 0);

export default function GrnsPage() {
  const [filters, setFilters] = useState({ search: "", page: 1, limit: 15 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data, isLoading } = useGrns(filters);
  const cancel = useCancelGrn();
  const grns = data?.data || [];
  const columns = [
    { key: "grnNumber", label: "GRN #", render: (row) => <span className="font-mono font-bold text-gray-700">{row.grnNumber}</span> },
    { key: "receiptDate", label: "Date", render: (row) => new Date(row.receiptDate).toLocaleDateString() },
    { key: "supplier", label: "Supplier", render: (row) => row.supplierName || row.supplierId?.displayName },
    { key: "warehouse", label: "Warehouse", render: (row) => row.warehouseId?.name },
    { key: "po", label: "PO #", render: (row) => row.poNumber ? <Badge variant="info">{row.poNumber}</Badge> : <span className="text-gray-400">Direct</span> },
    { key: "value", label: "Total Value", render: (row) => <span className="font-bold">{money(row.totalReceivedValue)}</span> },
    { key: "status", label: "Status", render: (row) => <Badge variant={row.status === "cancelled" ? "danger" : "success"}>{row.status}</Badge> },
    { key: "actions", label: "", render: (row) => <div className="flex justify-end">{row.status !== "cancelled" && <button title="Cancel GRN" disabled={cancel.isPending} onClick={() => { if (window.confirm(`Cancel GRN ${row.grnNumber}? Stock will be reversed.`)) cancel.mutate(row._id); }} className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>}</div> },
  ];
  return <div className="space-y-6"><PageHeader title="Goods Received Notes" description="View and record incoming goods (GRNs)" icon={PackageCheck} actions={<Button variant="primary" onClick={() => setIsFormOpen(true)}><Plus size={16} className="mr-1.5" /> New Direct GRN</Button>} /><Card><div className="border-b p-4"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Search by GRN number..." className="w-full rounded-lg border py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} /></div></div>{isLoading ? <div className="py-20 text-center">Loading...</div> : grns.length === 0 ? <EmptyState icon={PackageCheck} title="No goods received notes" description="Record your first direct GRN" action={<Button variant="primary" onClick={() => setIsFormOpen(true)}><Plus size={16} className="mr-1.5" /> New Direct GRN</Button>} /> : <><Table columns={columns} data={grns} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>}</Card><DirectGrnModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} /></div>;
}

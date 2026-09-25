"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useCreditNotes } from "../../../client/features/creditNotes/useCreditNotes.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const date = (value) => new Date(value).toLocaleDateString("en-LK");

export default function CreditNotesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ status: "", page: 1, limit: 15 });
  const { data, isLoading } = useCreditNotes(filters);
  const notes = data?.data || [];
  const openNote = (note) => router.push(`/credit-notes/${note._id}`);
  const columns = [
    { key: "creditNoteNumber", label: "CN #", render: (note) => <span className="font-mono text-xs">{note.creditNoteNumber}</span> },
    { key: "issueDate", label: "Date", render: (note) => date(note.issueDate) },
    { key: "customer", label: "Customer", render: (note) => note.customerSnapshot?.name },
    { key: "reason", label: "Reason", render: (note) => note.reason.replace(/_/g, " ") },
    { key: "amount", label: "Amount", render: (note) => money(note.amount) },
    { key: "remainingAmount", label: "Remaining", render: (note) => money(note.remainingAmount) },
    { key: "status", label: "Status", render: (note) => <Badge variant={note.status === "fully_applied" ? "success" : "info"}>{note.status.replace(/_/g, " ")}</Badge> },
    { key: "actions", label: "", width: "50px", render: (note) => <button onClick={() => openNote(note)} className="rounded p-1.5 hover:bg-gray-100"><Eye size={16} /></button> },
  ];

  let content;
  if (isLoading) content = <div className="py-16 text-center text-gray-500">Loading...</div>;
  else if (notes.length === 0) content = <EmptyState icon={FileText} title="No credit notes" description="Credit notes are issued from processed returns" />;
  else content = <><Table columns={columns} data={notes} onRowClick={openNote} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>;

  return <div><PageHeader title="Credit Notes" description="Credit issued to customers, typically from returns" /><Card>{content}</Card></div>;
}

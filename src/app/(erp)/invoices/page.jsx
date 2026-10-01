"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileText, Plus, Search } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { useAgingSummary, useInvoices } from "../../../client/features/invoices/useInvoices.js";
import { useAuthStore } from "../../../client/store/authStore.js";

const paymentStatusVariant = { unpaid: "warning", partially_paid: "info", paid: "success", overdue: "danger", cancelled: "default", written_off: "default" };
const agingBuckets = [
  { key: "current", label: "Current", color: "border-green-200 bg-green-50 text-green-700" },
  { key: "1_30", label: "1-30 days", color: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  { key: "31_60", label: "31-60 days", color: "border-orange-200 bg-orange-50 text-orange-700" },
  { key: "61_90", label: "61-90 days", color: "border-red-200 bg-red-50 text-red-700" },
  { key: "91_plus", label: "90+ days", color: "border-red-300 bg-red-100 text-red-800" },
];
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const date = (value) => value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canCreate = ["admin", "manager", "accountant", "sales_manager"].includes(user?.role);
  const [filters, setFilters] = useState({ search: "", paymentStatus: "", agingBucket: "", page: 1, limit: 15 });
  const { data, isLoading } = useInvoices(filters);
  const { data: agingData } = useAgingSummary();
  const invoices = data?.data || [];
  const aging = agingData?.data || { buckets: {}, counts: {} };
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: 1 }));

  const columns = [
    { key: "invoiceNumber", label: "Invoice #", width: "120px", render: (invoice) => <span className="font-mono text-xs">{invoice.invoiceNumber}</span> },
    { key: "invoiceDate", label: "Date", render: (invoice) => date(invoice.invoiceDate) },
    { key: "customer", label: "Customer", render: (invoice) => <div><p className="font-medium">{invoice.customerSnapshot?.name}</p><p className="text-xs text-gray-500">{invoice.customerSnapshot?.code}</p></div> },
    { key: "dueDate", label: "Due", render: (invoice) => <DueDate invoice={invoice} /> },
    { key: "grandTotal", label: "Total", render: (invoice) => <span className="font-medium">{money(invoice.grandTotal)}</span> },
    { key: "balanceDue", label: "Outstanding", render: (invoice) => invoice.balanceDue > 0 ? <span className="font-medium text-red-600">{money(invoice.balanceDue)}</span> : <span className="font-medium text-green-600">Paid</span> },
    { key: "paymentStatus", label: "Status", render: (invoice) => <Badge variant={paymentStatusVariant[invoice.paymentStatus]}>{invoice.paymentStatus.replace("_", " ")}</Badge> },
    { key: "actions", label: "", width: "50px", render: (invoice) => <button type="button" onClick={(event) => { event.stopPropagation(); router.push(`/invoices/${invoice._id}`); }} className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"><Eye size={16} /></button> },
  ];

  return (
    <div>
      <PageHeader title="Invoices" description="Bill customers and track outstanding payments" actions={canCreate && <div className="flex gap-2"><Link href="/invoices/from-sales-order"><Button variant="outline">From Sales Order</Button></Link><Link href="/invoices/new"><Button variant="primary"><Plus size={16} className="mr-1.5" />Manual Invoice</Button></Link></div>} />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
        {agingBuckets.map((bucket) => <button key={bucket.key} type="button" onClick={() => update("agingBucket", bucket.key)} className={`rounded-lg border p-3 text-left ${bucket.color} ${filters.agingBucket === bucket.key ? "ring-2 ring-primary-500 ring-offset-1" : ""}`}><p className="text-xs">{bucket.label}</p><p className="text-lg font-bold">{money(aging.buckets?.[bucket.key])}</p><p className="text-xs opacity-75">{aging.counts?.[bucket.key] || 0} invoices</p></button>)}
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
          <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search by invoice # or customer..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" value={filters.search} onChange={(event) => update("search", event.target.value)} /></div>
          <div className="w-48"><Select placeholder="All Statuses" options={[{ value: "unpaid", label: "Unpaid" }, { value: "partially_paid", label: "Partially Paid" }, { value: "paid", label: "Paid" }, { value: "overdue", label: "Overdue" }, { value: "cancelled", label: "Cancelled" }]} value={filters.paymentStatus} onChange={(event) => update("paymentStatus", event.target.value)} /></div>
          {filters.agingBucket && <Button variant="outline" size="sm" onClick={() => update("agingBucket", "")}>Clear aging filter</Button>}
        </div>
        {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : invoices.length === 0 ? <EmptyState icon={FileText} title="No invoices" description="Generate invoices from sales orders or create manual ones" action={canCreate && <Link href="/invoices/from-sales-order"><Button variant="primary">Generate from Sales Order</Button></Link>} /> : <><div className="overflow-x-auto"><Table columns={columns} data={invoices} onRowClick={(invoice) => router.push(`/invoices/${invoice._id}`)} /></div><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>}
      </Card>
    </div>
  );
}

function DueDate({ invoice }) {
  if (!invoice.dueDate) return <span className="text-gray-400">—</span>;
  return <div className={invoice.paymentStatus === "overdue" ? "text-red-600" : ""}><p className="text-sm">{date(invoice.dueDate)}</p>{invoice.daysPastDue > 0 && <p className="text-xs font-medium">{invoice.daysPastDue}d late</p>}</div>;
}

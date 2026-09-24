"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Plus, Receipt } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { useInvoices } from "../../../client/features/invoices/useInvoices.js";

const money = (value) => new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
}).format(value || 0);

export default function InvoicesPage() {
  const [filters, setFilters] = useState({ search: "", paymentStatus: "", page: 1, limit: 20 });
  const { data, isLoading } = useInvoices(filters);
  const invoices = data?.data || [];
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  const columns = [
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "invoiceDate", label: "Date", render: (invoice) => new Date(invoice.invoiceDate).toLocaleDateString("en-LK") },
    { key: "customer", label: "Customer", render: (invoice) => invoice.customerSnapshot?.name },
    { key: "grandTotal", label: "Total", render: (invoice) => money(invoice.grandTotal) },
    { key: "balanceDue", label: "Balance", render: (invoice) => money(invoice.balanceDue) },
    { key: "paymentStatus", label: "Payment", render: (invoice) => <Badge>{invoice.paymentStatus}</Badge> },
    { key: "status", label: "Status", render: (invoice) => <Badge variant="info">{invoice.status}</Badge> },
    { key: "view", label: "", render: (invoice) => <Link href={`/invoices/${invoice._id}`} className="text-primary-600"><Eye size={16} /></Link> },
  ];
  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Track customer invoices and payments"
        actions={
          <Link href="/invoices/new">
            <Button variant="primary">
              <Plus size={16} className="mr-1.5" />
              Manual Invoice
            </Button>
          </Link>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <Input placeholder="Search invoices..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
          <Select placeholder="All Payment Statuses" options={["unpaid", "partially_paid", "paid", "overdue"].map((value) => ({ value, label: value.replace("_", " ") }))} value={filters.paymentStatus} onChange={(event) => updateFilter("paymentStatus", event.target.value)} />
        </div>
      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : invoices.length ? (
        <>
          <Table columns={columns} data={invoices} />
          <Pagination
            page={filters.page}
            totalPages={data?.totalPages || 1}
            total={data?.total || 0}
            onPageChange={(page) =>
              setFilters((current) => ({ ...current, page }))
            }
          />
        </>
      ) : (
        <div className="py-16 text-center">
          <Receipt className="mx-auto mb-3 text-gray-300" />
          <h3 className="font-semibold">No invoices</h3>
          <p className="text-sm text-gray-500">
            Create a manual invoice to get started.
          </p>
        </div>
      )}
      </Card>
    </div>
  );
}

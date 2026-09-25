"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Wrench } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useRepairs } from "../../../client/features/repairs/useRepairs.js";

const variants = { pending: "default", in_progress: "warning", awaiting_parts: "warning", completed_fixed: "success", completed_unfixable: "danger", cancelled: "default" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function RepairsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ status: "", page: 1, limit: 15 });
  const { data, isLoading } = useRepairs(filters);
  const repairs = data?.data || [];
  const columns = [
    { key: "repairNumber", label: "Ref #", render: (repair) => <span className="font-mono text-xs">{repair.repairNumber}</span> },
    { key: "createdAt", label: "Date", render: (repair) => new Date(repair.createdAt).toLocaleDateString("en-LK") },
    { key: "product", label: "Product", render: (repair) => repair.productName },
    { key: "quantity", label: "Qty", render: (repair) => repair.quantity },
    { key: "issue", label: "Issue", render: (repair) => <span className="block max-w-xs truncate text-sm">{repair.issueDescription}</span> },
    { key: "cost", label: "Total Cost", render: (repair) => money(repair.totalActualCost) },
    { key: "status", label: "Status", render: (repair) => <Badge variant={variants[repair.status]}>{repair.status.replace(/_/g, " ")}</Badge> },
    {
      key: "actions", label: "", width: "50px",
      render: (repair) => <button onClick={() => router.push(`/repairs/${repair._id}`)} className="rounded p-1.5 hover:bg-gray-100"><Eye size={16} /></button>,
    },
  ];

  return (
    <div>
      <PageHeader title="Repairs Workshop" description="Track items being repaired" />
      <Card>
        <div className="flex gap-3 border-b p-4">
          <div className="w-48">
            <Select
              placeholder="All Statuses"
              options={[{ value: "pending", label: "Pending" }, { value: "in_progress", label: "In Progress" }, { value: "awaiting_parts", label: "Awaiting Parts" }, { value: "completed_fixed", label: "Fixed" }, { value: "completed_unfixable", label: "Unfixable" }]}
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
            />
          </div>
        </div>
        {isLoading && <div className="py-16 text-center text-gray-500">Loading...</div>}
        {!isLoading && repairs.length === 0 && <EmptyState icon={Wrench} title="No repairs" description="Repairs are created when returns have disposition 'repair'" />}
        {!isLoading && repairs.length > 0 && (
          <>
            <Table columns={columns} data={repairs} onRowClick={(repair) => router.push(`/repairs/${repair._id}`)} />
            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
          </>
        )}
      </Card>
    </div>
  );
}

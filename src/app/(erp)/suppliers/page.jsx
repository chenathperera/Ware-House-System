"use client";
import { useState } from "react";
import { Edit, Plus, Search, Trash2, Truck } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import SupplierFormModal from "../../../client/features/suppliers/SupplierFormModal.jsx";
import {
  useDeleteSupplier,
  useSuppliers,
} from "../../../client/features/suppliers/useSuppliers.js";
import { useAuthStore } from "../../../client/store/authStore.js";

const statusVariant = {
  active: "success",
  inactive: "default",
  on_hold: "warning",
  blacklisted: "danger",
};
const categories = {
  raw_material: "Raw Material",
  packaging: "Packaging",
  services: "Services",
  equipment: "Equipment",
  finished_goods: "Finished Goods",
  multiple: "Multiple",
};

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const canManage = ["admin", "manager", "accountant"].includes(user?.role);
  const canDelete = ["admin", "manager"].includes(user?.role);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    page: 1,
    limit: 10,
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { data, isLoading } = useSuppliers(filters);
  const deletion = useDeleteSupplier();
  const suppliers = data?.data || [];
  const update = (change) =>
    setFilters((current) => ({ ...current, ...change }));
  const columns = supplierColumns({
    canManage,
    canDelete,
    setEditing,
    setIsFormOpen,
    setDeleting,
  });
  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your suppliers"
        actions={
          canManage && (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
            >
              <Plus size={16} className="mr-1.5" />
              Add Supplier
            </Button>
          )
        }
      />
      <Card>
        <Filters filters={filters} update={update} />
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers"
            description="Add suppliers to start purchasing"
            action={
              canManage && (
                <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                  <Plus size={16} className="mr-1.5" />
                  Add Supplier
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={columns} data={suppliers} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              onPageChange={(page) => update({ page })}
            />
          </>
        )}
      </Card>
      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        supplier={editing}
      />
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deletion.mutateAsync(deleting._id);
          setDeleting(null);
        }}
        title="Delete Supplier"
        message={`Delete "${deleting?.displayName}"? This is a soft delete.`}
        loading={deletion.isPending}
      />
    </div>
  );
}
function Filters({ filters, update }) {
  return (
    <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
      <div className="relative min-w-[200px] flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value, page: 1 })}
        />
      </div>
      <div className="w-48">
        <Select
          placeholder="All Categories"
          options={Object.entries(categories).map(([value, label]) => ({
            value,
            label,
          }))}
          value={filters.category}
          onChange={(event) =>
            update({ category: event.target.value, page: 1 })
          }
        />
      </div>
      <div className="w-40">
        <Select
          placeholder="All Statuses"
          options={Object.keys(statusVariant).map((value) => ({
            value,
            label: value.replace("_", " "),
          }))}
          value={filters.status}
          onChange={(event) => update({ status: event.target.value, page: 1 })}
        />
      </div>
    </div>
  );
}
function supplierColumns(actions) {
  return [
    {
      key: "supplierCode",
      label: "Code",
      width: "110px",
      render: (row) => (
        <span className="font-mono text-xs">{row.supplierCode}</span>
      ),
    },
    {
      key: "displayName",
      label: "Supplier",
      render: (row) => (
        <div>
          <p className="font-medium">{row.displayName}</p>
          {row.companyName && row.companyName !== row.displayName && (
            <p className="text-xs text-gray-500">{row.companyName}</p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => <Badge>{categories[row.category]}</Badge>,
    },
    {
      key: "contact",
      label: "Contact",
      render: (row) => (
        <div className="text-xs">
          {row.primaryContact?.name && <p>{row.primaryContact.name}</p>}
          {row.primaryContact?.phone && (
            <p className="text-gray-500">{row.primaryContact.phone}</p>
          )}
        </div>
      ),
    },
    {
      key: "payment",
      label: "Terms",
      render: (row) => <Terms terms={row.paymentTerms} />,
    },
    {
      key: "leadTime",
      label: "Lead Time",
      render: (row) =>
        row.averageLeadTimeDays ? `${row.averageLeadTimeDays}d` : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (row) => (
        <div className="flex gap-1">
          {actions.canManage && (
            <button
              onClick={() => {
                actions.setEditing(row);
                actions.setIsFormOpen(true);
              }}
              className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
              title="Edit"
            >
              <Edit size={16} />
            </button>
          )}
          {actions.canDelete && (
            <button
              onClick={() => actions.setDeleting(row)}
              className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];
}
function Terms({ terms }) {
  if (terms?.type === "credit")
    return <Badge variant="info">{terms.creditDays}d credit</Badge>;
  if (terms?.type === "advance")
    return <Badge variant="warning">Advance</Badge>;
  if (terms?.type === "consignment")
    return <Badge variant="info">Consignment</Badge>;
  return <Badge>COD</Badge>;
}

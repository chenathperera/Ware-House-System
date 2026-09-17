"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Edit, Plus, Search, Trash2, Truck } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "../../../client/features/suppliers/useSuppliers.js";
import { useAuthStore } from "../../../client/store/authStore.js";

const categories = [
  "raw_material",
  "packaging",
  "services",
  "equipment",
  "finished_goods",
  "multiple",
];
const statuses = ["active", "inactive", "blacklisted", "on_hold"];
const statusVariant = {
  active: "success",
  inactive: "default",
  on_hold: "warning",
  blacklisted: "danger",
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
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { data, isLoading } = useSuppliers(filters);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();
  const { register, handleSubmit, reset } = useForm();
  const suppliers = data?.data || [];

  const openForm = (supplier = null) => {
    setEditing(supplier || {});
    reset({
      type: supplier?.type || "company",
      displayName: supplier?.displayName || "",
      companyName: supplier?.companyName || "",
      category: supplier?.category || "multiple",
      contactName: supplier?.primaryContact?.name || "",
      phone: supplier?.primaryContact?.phone || "",
      email: supplier?.primaryContact?.email || "",
      paymentType: supplier?.paymentTerms?.type || "credit",
      creditDays: supplier?.paymentTerms?.creditDays || 30,
      creditLimit: supplier?.paymentTerms?.creditLimit || 0,
      averageLeadTimeDays: supplier?.averageLeadTimeDays || 7,
      status: supplier?.status || "active",
      notes: supplier?.notes || "",
    });
  };
  const submit = async (form) => {
    const payload = {
      type: form.type,
      displayName: form.displayName,
      companyName: form.companyName || undefined,
      category: form.category,
      primaryContact: {
        name: form.contactName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      },
      paymentTerms: {
        type: form.paymentType,
        creditDays: Number(form.creditDays) || 0,
        creditLimit: Number(form.creditLimit) || 0,
      },
      averageLeadTimeDays: Number(form.averageLeadTimeDays) || 0,
      status: form.status,
      notes: form.notes || undefined,
    };
    try {
      if (editing?._id)
        await updateMutation.mutateAsync({ id: editing._id, data: payload });
      else await createMutation.mutateAsync(payload);
      setEditing(null);
    } catch {}
  };
  const columns = [
    {
      key: "supplierCode",
      label: "Code",
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
          <p className="text-xs text-gray-500">
            {row.primaryContact?.phone || ""}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => <Badge>{row.category}</Badge>,
    },
    {
      key: "paymentTerms",
      label: "Terms",
      render: (row) => (
        <Badge>
          {row.paymentTerms?.type === "credit"
            ? `${row.paymentTerms.creditDays}d credit`
            : row.paymentTerms?.type?.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "averageLeadTimeDays",
      label: "Lead Time",
      render: (row) => `${row.averageLeadTimeDays || 0}d`,
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
      render: (row) => (
        <div className="flex gap-1">
          {canManage && (
            <button
              onClick={() => openForm(row)}
              className="rounded p-1.5 text-gray-500 hover:bg-primary-50"
            >
              <Edit size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setDeleting(row)}
              className="rounded p-1.5 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];
  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your suppliers"
        actions={
          canManage && (
            <Button variant="primary" onClick={() => openForm()}>
              <Plus size={16} className="mr-1.5" />
              Add Supplier
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              className="w-full rounded-lg border px-9 py-2 text-sm"
              placeholder="Search..."
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value, page: 1 })
              }
            />
          </div>
          <Select
            placeholder="All Categories"
            options={categories.map((value) => ({ value, label: value }))}
            value={filters.category}
            onChange={(event) =>
              setFilters({ ...filters, category: event.target.value, page: 1 })
            }
          />
          <Select
            placeholder="All Statuses"
            options={statuses.map((value) => ({ value, label: value }))}
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value, page: 1 })
            }
          />
        </div>
        {isLoading ? (
          <div className="py-16 text-center">Loading...</div>
        ) : suppliers.length ? (
          <>
            <Table columns={columns} data={suppliers} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        ) : (
          <EmptyState
            icon={Truck}
            title="No suppliers"
            description="Add suppliers to start purchasing"
          />
        )}
      </Card>
      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?._id ? "Edit Supplier" : "New Supplier"}
        size="lg"
      >
        <form onSubmit={handleSubmit(submit)}>
          <div className="grid grid-cols-2 gap-4 p-6">
            <Select
              label="Type"
              options={[
                { value: "company", label: "Company" },
                { value: "individual", label: "Individual" },
              ]}
              {...register("type")}
            />
            <Select
              label="Category"
              options={categories.map((value) => ({ value, label: value }))}
              {...register("category")}
            />
            <Input label="Display Name" required {...register("displayName")} />
            <Input label="Company Name" {...register("companyName")} />
            <Input label="Contact Name" {...register("contactName")} />
            <Input label="Phone" {...register("phone")} />
            <Input label="Email" type="email" {...register("email")} />
            <Select
              label="Payment Terms"
              options={["advance", "cod", "credit", "consignment"].map(
                (value) => ({ value, label: value }),
              )}
              {...register("paymentType")}
            />
            <Input
              label="Credit Days"
              type="number"
              {...register("creditDays")}
            />
            <Input
              label="Credit Limit (LKR)"
              type="number"
              {...register("creditLimit")}
            />
            <Input
              label="Lead Time (Days)"
              type="number"
              {...register("averageLeadTimeDays")}
            />
            <Select
              label="Status"
              options={statuses.map((value) => ({ value, label: value }))}
              {...register("status")}
            />
            <Textarea
              className="col-span-2"
              label="Notes"
              {...register("notes")}
            />
          </div>
          <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing?._id ? "Update Supplier" : "Create Supplier"}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleting._id);
          setDeleting(null);
        }}
        title="Delete Supplier"
        message={`Delete "${deleting?.displayName}"? This is a soft delete.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

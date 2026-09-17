"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Ban,
  CheckCircle,
  Edit,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
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
import { customerGroupFormSchema } from "../../../client/features/customer-groups/customerGroupSchemas.js";
import { customerFormSchema } from "../../../client/features/customers/customerSchemas.js";
import { useCustomerGroups } from "../../../client/features/customer-groups/useCustomerGroups.js";
import {
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useToggleCreditHold,
  useUpdateCustomer,
} from "../../../client/features/customers/useCustomers.js";
import { useAuthStore } from "../../../client/store/authStore.js";

const statusVariants = {
  active: "success",
  inactive: "default",
  prospect: "info",
  on_hold: "warning",
  blacklisted: "danger",
};

export default function CustomersPage() {
  const { user } = useAuthStore();
  const canManage = ["admin", "manager", "sales_manager", "sales_rep"].includes(
    user?.role,
  );
  const canDelete = ["admin", "manager"].includes(user?.role);
  const canHoldCredit = ["admin", "manager", "accountant"].includes(user?.role);
  const [filters, setFilters] = useState({
    search: "",
    customerGroupId: "",
    status: "",
    page: 1,
    limit: 10,
  });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [holding, setHolding] = useState(null);
  const { data, isLoading } = useCustomers(filters);
  const { data: groupsData } = useCustomerGroups();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const holdMutation = useToggleCreditHold();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(customerFormSchema) });

  const openForm = (customer = null) => {
    setEditing(customer || {});
    reset({
      customerType: customer?.customerType || "company",
      businessType: customer?.businessType || "retailer",
      displayName: customer?.displayName || "",
      companyName: customer?.companyName || "",
      customerGroupId: customer?.customerGroupId?._id || "",
      contactName: customer?.primaryContact?.name || "",
      email: customer?.primaryContact?.email || "",
      phone: customer?.primaryContact?.phone || "",
      paymentTermsType: customer?.paymentTerms?.type || "cod",
      creditDays: customer?.paymentTerms?.creditDays || 0,
      creditLimit: customer?.paymentTerms?.creditLimit || 0,
      defaultDiscountPercent: customer?.defaultDiscountPercent || 0,
      status: customer?.status || "active",
      notes: customer?.notes || "",
    });
  };
  const closeForm = () => setEditing(null);
  const submit = async (form) => {
    const payload = {
      customerType: form.customerType,
      businessType: form.businessType,
      displayName: form.displayName,
      companyName: form.companyName || undefined,
      customerGroupId: form.customerGroupId || undefined,
      primaryContact: {
        name: form.contactName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      },
      paymentTerms: {
        type: form.paymentTermsType,
        creditDays: form.creditDays || 0,
        creditLimit: form.creditLimit || 0,
      },
      defaultDiscountPercent: form.defaultDiscountPercent || 0,
      status: form.status,
      notes: form.notes || undefined,
    };
    try {
      if (editing?._id)
        await updateMutation.mutateAsync({ id: editing._id, data: payload });
      else await createMutation.mutateAsync(payload);
      closeForm();
    } catch {
      /* mutation toast */
    }
  };
  const groups = groupsData?.data || [];
  const customers = data?.data || [];
  const columns = [
    {
      key: "customerCode",
      label: "Code",
      render: (row) => (
        <span className="font-mono text-xs">{row.customerCode}</span>
      ),
    },
    {
      key: "displayName",
      label: "Customer",
      render: (row) => (
        <div>
          <p className="flex items-center gap-2 font-medium">
            {row.displayName}
            {row.creditStatus?.onCreditHold && (
              <Ban size={14} className="text-red-500" />
            )}
          </p>
          <p className="text-xs text-gray-500">
            {row.primaryContact?.phone || ""}
          </p>
        </div>
      ),
    },
    {
      key: "customerGroupId",
      label: "Group",
      render: (row) =>
        row.customerGroupId ? (
          <span
            className="rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: row.customerGroupId.color || "#6b7280" }}
          >
            {row.customerGroupId.name}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "terms",
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
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={statusVariants[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          {canHoldCredit && (
            <button
              onClick={() => setHolding(row)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
              title="Toggle credit hold"
            >
              {row.creditStatus?.onCreditHold ? (
                <CheckCircle size={16} />
              ) : (
                <Ban size={16} />
              )}
            </button>
          )}
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
        title="Customers"
        description="Manage your wholesale customers"
        actions={
          canManage && (
            <Button variant="primary" onClick={() => openForm()}>
              <Plus size={16} className="mr-1.5" />
              Add Customer
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
              placeholder="Search by name, code, or phone..."
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value, page: 1 })
              }
            />
          </div>
          <Select
            placeholder="All Groups"
            options={groups.map((group) => ({
              value: group._id,
              label: group.name,
            }))}
            value={filters.customerGroupId}
            onChange={(event) =>
              setFilters({
                ...filters,
                customerGroupId: event.target.value,
                page: 1,
              })
            }
          />
          <Select
            placeholder="All Statuses"
            options={Object.keys(statusVariants).map((status) => ({
              value: status,
              label: status,
            }))}
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value, page: 1 })
            }
          />
        </div>
        {isLoading ? (
          <div className="py-16 text-center">Loading customers...</div>
        ) : customers.length ? (
          <>
            <Table columns={columns} data={customers} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Add your first customer to get started"
          />
        )}
      </Card>
      <Modal
        isOpen={editing !== null}
        onClose={closeForm}
        title={editing?._id ? "Edit Customer" : "New Customer"}
        size="lg"
      >
        <form onSubmit={handleSubmit(submit)}>
          <div className="grid grid-cols-2 gap-4 p-6">
            <Select
              label="Customer Type"
              options={[
                { value: "company", label: "Company" },
                { value: "individual", label: "Individual" },
              ]}
              {...register("customerType")}
            />
            <Select
              label="Business Type"
              options={[
                "wholesaler",
                "retailer",
                "distributor",
                "reseller",
                "end_user",
                "other",
              ].map((value) => ({ value, label: value }))}
              {...register("businessType")}
            />
            <Input
              label="Display Name"
              required
              error={errors.displayName?.message}
              {...register("displayName")}
            />
            <Input label="Company Name" {...register("companyName")} />
            <Select
              label="Customer Group"
              placeholder="None"
              options={groups.map((group) => ({
                value: group._id,
                label: group.name,
              }))}
              {...register("customerGroupId")}
            />
            <Select
              label="Status"
              options={Object.keys(statusVariants).map((value) => ({
                value,
                label: value,
              }))}
              {...register("status")}
            />
            <Input label="Contact Name" {...register("contactName")} />
            <Input label="Phone" {...register("phone")} />
            <Input
              label="Email"
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Select
              label="Payment Terms"
              options={[
                { value: "advance", label: "Advance" },
                { value: "cod", label: "COD" },
                { value: "credit", label: "Credit" },
              ]}
              {...register("paymentTermsType")}
            />
            <Input
              label="Credit Days"
              type="number"
              error={errors.creditDays?.message}
              {...register("creditDays")}
            />
            <Input
              label="Credit Limit (LKR)"
              type="number"
              error={errors.creditLimit?.message}
              {...register("creditLimit")}
            />
            <Input
              label="Default Discount %"
              type="number"
              error={errors.defaultDiscountPercent?.message}
              {...register("defaultDiscountPercent")}
            />
            <Textarea
              className="col-span-2"
              label="Notes"
              {...register("notes")}
            />
          </div>
          <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
            <Button variant="outline" type="button" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing?._id ? "Update Customer" : "Create Customer"}
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
        title="Delete Customer"
        message={`Delete "${deleting?.displayName}"? This is a soft delete.`}
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        isOpen={!!holding}
        onClose={() => setHolding(null)}
        onConfirm={async () => {
          await holdMutation.mutateAsync({
            id: holding._id,
            reason: "Manual hold",
          });
          setHolding(null);
        }}
        title={
          holding?.creditStatus?.onCreditHold
            ? "Remove Credit Hold"
            : "Place on Credit Hold"
        }
        message={`Change credit hold for "${holding?.displayName}"?`}
        loading={holdMutation.isPending}
      />
    </div>
  );
}

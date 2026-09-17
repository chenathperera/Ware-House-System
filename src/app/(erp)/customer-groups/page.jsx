"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Eye, Plus, Tags, Trash2 } from "lucide-react";
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
import { customerGroupFormSchema } from "../../../client/features/customer-groups/customerGroupSchemas.js";
import {
  useCreateCustomerGroup,
  useCustomerGroups,
  useDeleteCustomerGroup,
  useUpdateCustomerGroup,
} from "../../../client/features/customer-groups/useCustomerGroups.js";
import { useAuthStore } from "../../../client/store/authStore.js";

export default function CustomerGroupsPage() {
  const { user } = useAuthStore();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isView, setIsView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { data, isLoading } = useCustomerGroups();
  const createMutation = useCreateCustomerGroup();
  const updateMutation = useUpdateCustomerGroup();
  const deleteMutation = useDeleteCustomerGroup();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerGroupFormSchema),
    defaultValues: {
      paymentType: "cod",
      isActive: true,
      color: "#6366f1",
    },
  });

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setIsView(false);
  };

  const openForm = (group = null, viewMode = false) => {
    setEditing(group);
    setIsView(viewMode);

    reset(group ? {
      name: group.name,
      code: group.code,
      description: group.description || "",
      paymentType: group.defaultPaymentTerms?.type || "cod",
      creditDays: group.defaultPaymentTerms?.creditDays || 0,
      defaultCreditLimit: group.defaultPaymentTerms?.defaultCreditLimit || 0,
      defaultDiscountPercent: group.defaultDiscountPercent || 0,
      priority: group.priority || 0,
      color: group.color || "#6366f1",
      isActive: group.isActive,
    } : {
      name: "",
      code: "",
      description: "",
      paymentType: "cod",
      creditDays: 0,
      defaultCreditLimit: 0,
      defaultDiscountPercent: 0,
      priority: 0,
      color: "#6366f1",
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (formData) => {
    const payload = {
      name: formData.name,
      code: formData.code,
      description: formData.description || undefined,
      defaultPaymentTerms: {
        type: formData.paymentType,
        creditDays: formData.creditDays || 0,
        defaultCreditLimit: formData.defaultCreditLimit || 0,
      },
      defaultDiscountPercent: formData.defaultDiscountPercent || 0,
      priority: formData.priority || 0,
      color: formData.color,
      isActive: formData.isActive,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      closeForm();
    } catch {
      // The React Query mutation shows the error toast.
    }
  };

  const groups = data?.data || [];
  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      key: "terms",
      label: "Default Terms",
      render: (row) => {
        const terms = row.defaultPaymentTerms?.type;
        if (terms === "credit") {
          return <Badge variant="info">{row.defaultPaymentTerms.creditDays}d credit</Badge>;
        }
        return <Badge variant={terms === "advance" ? "warning" : undefined}>{terms === "advance" ? "Advance" : "COD"}</Badge>;
      },
    },
    {
      key: "discount",
      label: "Discount",
      render: (row) => `${row.defaultDiscountPercent || 0}%`,
    },
    { key: "priority", label: "Priority" },
    {
      key: "isActive",
      label: "Active",
      render: (row) => (
        <Badge variant={row.isActive ? "success" : "default"}>
          {row.isActive ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (row) => canManage && (
        <div className="flex gap-1">
          <button onClick={() => openForm(row, true)} className="rounded p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600" title="View">
            <Eye size={16} />
          </button>
          <button onClick={() => openForm(row)} className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600" title="Edit">
            <Edit size={16} />
          </button>
          <button onClick={() => setDeleting(row)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customer Groups"
        description="Segment customers by tier for pricing and credit terms"
        actions={canManage && (
          <Button variant="primary" onClick={() => openForm()}>
            <Plus size={16} className="mr-1.5" />
            Add Group
          </Button>
        )}
      />

      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : groups.length === 0 ? (
          <EmptyState icon={Tags} title="No customer groups" description="Groups help segment your customers" />
        ) : (
          <Table columns={columns} data={groups} />
        )}
      </Card>

      <Modal isOpen={isFormOpen} onClose={closeForm} title={editing ? "Edit Customer Group" : "New Customer Group"} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-4">
              <Input disabled={isView} label="Name" required error={errors.name?.message} {...register("name")} />
              <Input disabled={isView} label="Code" required error={errors.code?.message} {...register("code")} />
            </div>

            <Textarea disabled={isView} label="Description" rows={2} error={errors.description?.message} {...register("description")} />

            <div className="grid grid-cols-2 gap-4">
              <Select disabled={isView} label="Default Payment Type" required options={[{ value: "advance", label: "Advance" }, { value: "cod", label: "COD" }, { value: "credit", label: "Credit" }]} {...register("paymentType")} />
              <Input disabled={isView} label="Default Discount %" type="number" step="0.01" error={errors.defaultDiscountPercent?.message} {...register("defaultDiscountPercent")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input disabled={isView} label="Default Credit Days" type="number" error={errors.creditDays?.message} {...register("creditDays")} />
              <Input disabled={isView} label="Default Credit Limit (LKR)" type="number" step="0.01" error={errors.defaultCreditLimit?.message} {...register("defaultCreditLimit")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input disabled={isView} label="Priority" type="number" error={errors.priority?.message} {...register("priority")} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                <input type="color" disabled={isView} className="h-10 w-full cursor-pointer rounded-lg border border-gray-300" {...register("color")} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" disabled={isView} id="groupActive" {...register("isActive")} />
              <label htmlFor="groupActive" className="text-sm text-gray-700">Active</label>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
            <Button variant="outline" type="button" onClick={closeForm}>Cancel</Button>
            {!isView && <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>{editing ? "Update" : "Create"}</Button>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={async () => { await deleteMutation.mutateAsync(deleting._id); setDeleting(null); }} title="Delete Customer Group" message={`Delete "${deleting?.name}"? Customers in this group will become ungrouped.`} loading={deleteMutation.isPending} />
    </div>
  );
}

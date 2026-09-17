"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Plus, Edit, Trash2, Award } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import { brandFormSchema } from "../../../client/features/brands/brandSchemas.js";
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
} from "../../../client/features/brands/useBrands.js";
import { useAuthStore } from "../../../client/store/authStore.js";

export default function BrandsPage() {
  const { user } = useAuthStore();
  const canManage = ["admin", "manager"].includes(user?.role);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isView, setIsView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useBrands();

  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(brandFormSchema),
    defaultValues: { isOwnBrand: true, isActive: true },
  });

  const openForm = (brand = null, viewMode = false) => {
    setIsView(viewMode);
    setEditing(brand);
    if (brand) {
      reset({
        name: brand.name,
        code: brand.code || "",
        description: brand.description || "",
        isOwnBrand: brand.isOwnBrand,
        isActive: brand.isActive,
      });
    } else {
      reset({ name: "", code: "", description: "", isOwnBrand: true, isActive: true });
    }
    setIsFormOpen(true);
  };

  const onSubmit = async (formData) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsFormOpen(false);
      setEditing(null);
      setIsView(false);
    } catch {
      /* toast handled by mutation */
    }
  };

  const brands = data?.data || [];

  const columns = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code", render: (r) => r.code || "—" },
    {
      key: "isOwnBrand",
      label: "Type",
      render: (r) => (
        <Badge variant={r.isOwnBrand ? "primary" : "default"}>
          {r.isOwnBrand ? "Own Brand" : "Third-Party"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Active",
      render: (r) => (
        <Badge variant={r.isActive ? "success" : "default"}>{r.isActive ? "Yes" : "No"}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (r) =>
        canManage && (
          <div className="flex gap-1">
            <button
              onClick={() => openForm(r, true)}
              className="rounded p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
              title="View"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => openForm(r)}
              className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => setDeleting(r)}
              className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage product brands"
        actions={
          canManage && (
            <Button variant="primary" onClick={() => openForm()}>
              <Plus size={16} className="mr-1.5" />
              Add Brand
            </Button>
          )
        }
      />

      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : brands.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No brands yet"
            description="Add brands to classify your products"
            action={
              canManage && (
                <Button variant="primary" onClick={() => openForm()}>
                  <Plus size={16} className="mr-1.5" />
                  Add Brand
                </Button>
              )
            }
          />
        ) : (
          <Table columns={columns} data={brands} />
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
          setIsView(false);
        }}
        title={editing ? "Edit Brand" : "New Brand"}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                disabled={isView}
                label="Name"
                required
                error={errors.name?.message}
                {...register("name")}
              />
              <Input disabled={isView} label="Code" error={errors.code?.message} {...register("code")} />
            </div>
            <Textarea
              disabled={isView}
              label="Description"
              rows={2}
              error={errors.description?.message}
              {...register("description")}
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" disabled={isView} id="isOwnBrand" {...register("isOwnBrand")} />
                <label htmlFor="isOwnBrand" className="text-sm text-gray-700">
                  Own brand (we manufacture)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" disabled={isView} id="isActiveB" {...register("isActive")} />
                <label htmlFor="isActiveB" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
            <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            {!isView && (
              <Button
                type="submit"
                variant="primary"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Update" : "Create"}
              </Button>
            )}
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
        title="Delete Brand"
        message={`Delete brand "${deleting?.name}"?`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

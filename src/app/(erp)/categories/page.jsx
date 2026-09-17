"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Plus, Edit, Trash2, FolderTree } from "lucide-react";
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
import { categoryFormSchema } from "../../../client/features/categories/categorySchemas.js";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../../../client/features/categories/useCategories.js";
import { useAuthStore } from "../../../client/store/authStore.js";

function CategoriesPage() {
  const { user } = useAuthStore();
  const canManage = ["admin", "manager"].includes(user?.role);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isView, setIsView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useCategories({});

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { type: "product", isActive: true },
  });

  const openForm = (category = null, viewMode = false) => {
    setIsView(viewMode);
    setEditing(category);
    if (category) {
      reset({
        name: category.name,
        code: category.code,
        description: category.description || "",
        parentCategory: category.parentCategory?._id || "",
        type: category.type,
        isActive: category.isActive,
      });
    } else {
      reset({
        name: "",
        code: "",
        description: "",
        parentCategory: "",
        type: "product",
        isActive: true,
      });
    }
    setIsFormOpen(true);
  };

  const onSubmit = async (formData) => {
    const payload = {
      ...formData,
      parentCategory: formData.parentCategory || null,
      description: formData.description || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setIsFormOpen(false);
      setEditing(null);
      setIsView(false);
    } catch {
      /* toast handled by mutation */
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleting._id);
    setDeleting(null);
  };

  const categories = data?.data || [];
  const parentOptions = categories
    .filter((c) => c._id !== editing?._id)
    .map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }));

  const columns = [
    {
      key: "code",
      label: "Code",
      width: "100px",
      render: (r) => <span className="font-mono text-xs">{r.code}</span>,
    },
    { key: "name", label: "Name" },
    {
      key: "parentCategory",
      label: "Parent",
      render: (r) => r.parentCategory?.name || "—",
    },
    {
      key: "type",
      label: "Type",
      render: (r) => <Badge>{r.type}</Badge>,
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
        title="Categories"
        description="Organize products into categories"
        actions={
          canManage && (
            <Button variant="primary" onClick={() => openForm()}>
              <Plus size={16} className="mr-1.5" />
              Add Category
            </Button>
          )
        }
      />

      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No categories yet"
            description="Categories help organize your products"
            action={
              canManage && (
                <Button variant="primary" onClick={() => openForm()}>
                  <Plus size={16} className="mr-1.5" />
                  Add Category
                </Button>
              )
            }
          />
        ) : (
          <Table columns={columns} data={categories} />
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
          setIsView(false);
        }}
        title={editing ? "Edit Category" : "New Category"}
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
              <Input
                disabled={isView}
                label="Code"
                required
                error={errors.code?.message}
                {...register("code")}
              />
            </div>
            <Select
              disabled={isView}
              label="Type"
              required
              error={errors.type?.message}
              options={[
                { value: "product", label: "Product" },
                { value: "raw_material", label: "Raw Material" },
                { value: "both", label: "Both" },
              ]}
              {...register("type")}
            />
            <Select
              disabled={isView}
              label="Parent Category (optional)"
              options={parentOptions}
              {...register("parentCategory")}
            />
            <Textarea
              disabled={isView}
              label="Description"
              rows={2}
              error={errors.description?.message}
              {...register("description")}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" disabled={isView} id="isActive" {...register("isActive")} />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active
              </label>
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
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${deleting?.name}"? Products in this category will need to be reassigned.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export default CategoriesPage;

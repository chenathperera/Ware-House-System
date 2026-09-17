"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Edit, Plus, Search, Trash2, Package } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import { useCategories } from "../../../client/features/categories/useCategories.js";
import { useBrands } from "../../../client/features/brands/useBrands.js";
import { useUoms } from "../../../client/features/uoms/useUoms.js";
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "../../../client/features/products/useProducts.js";
import { useAuthStore } from "../../../client/store/authStore.js";
const statuses = ["active", "inactive", "draft", "discontinued"];
export default function ProductsPage() {
  const { user } = useAuthStore();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    status: "",
    page: 1,
    limit: 10,
  });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { data, isLoading } = useProducts(filters);
  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const { data: uomsData } = useUoms();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { register, handleSubmit, reset } = useForm();
  const categories = categoriesData?.data || [];
  const brands = brandsData?.data || [];
  const uoms = uomsData?.data || [];
  const products = data?.data || [];
  const open = (product = null) => {
    setEditing(product || {});
    reset({
      name: product?.name || "",
      sku: product?.sku || "",
      categoryId: product?.categoryId?._id || "",
      brandId: product?.brandId?._id || "",
      unitOfMeasure: product?.unitOfMeasure || "",
      basePrice: product?.basePrice || 0,
      purchasePrice: product?.purchasePrice || 0,
      productType: product?.productType || "finished_good",
      type: product?.type || "trading",
      status: product?.status || "active",
    });
  };
  const submit = async (form) => {
    const payload = {
      ...form,
      basePrice: Number(form.basePrice),
      purchasePrice: Number(form.purchasePrice || 0),
      brandId: form.brandId || undefined,
    };
    try {
      if (editing?._id)
        await updateMutation.mutateAsync({ id: editing._id, data: payload });
      else await createMutation.mutateAsync(payload);
      setEditing(null);
    } catch {}
  };
  const columns = [
    { key: "productCode", label: "Code" },
    {
      key: "name",
      label: "Product",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-gray-500">{row.sku || ""}</p>
        </div>
      ),
    },
    {
      key: "categoryId",
      label: "Category",
      render: (row) => row.categoryId?.name || "—",
    },
    {
      key: "brandId",
      label: "Brand",
      render: (row) => row.brandId?.name || "—",
    },
    {
      key: "basePrice",
      label: "Price",
      render: (row) => `LKR ${Number(row.basePrice || 0).toLocaleString()}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        canManage && (
          <div className="flex gap-1">
            <button onClick={() => open(row)}>
              <Edit size={16} />
            </button>
            <button onClick={() => setDeleting(row)} className="text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ),
    },
  ];
  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          canManage && (
            <Button variant="primary" onClick={() => open()}>
              <Plus size={16} className="mr-1.5" />
              Add Product
            </Button>
          )
        }
      />
      <Card>
        <div className="flex gap-3 border-b p-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              className="w-full rounded border px-9 py-2"
              placeholder="Search by name, SKU, code..."
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value, page: 1 })
              }
            />
          </div>
          <Select
            placeholder="All Categories"
            options={categories.map((item) => ({
              value: item._id,
              label: item.name,
            }))}
            value={filters.categoryId}
            onChange={(event) =>
              setFilters({
                ...filters,
                categoryId: event.target.value,
                page: 1,
              })
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
          <div className="py-16 text-center">Loading products...</div>
        ) : products.length ? (
          <>
            <Table columns={columns} data={products} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        ) : (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Add your first product"
          />
        )}
      </Card>
      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?._id ? "Edit Product" : "New Product"}
        size="lg"
      >
        <form onSubmit={handleSubmit(submit)}>
          <div className="grid grid-cols-2 gap-4 p-6">
            <Input label="Name" required {...register("name")} />
            <Input label="SKU" {...register("sku")} />
            <Select
              label="Category"
              options={categories.map((item) => ({
                value: item._id,
                label: item.name,
              }))}
              {...register("categoryId")}
            />
            <Select
              label="Brand"
              placeholder="None"
              options={brands.map((item) => ({
                value: item._id,
                label: item.name,
              }))}
              {...register("brandId")}
            />
            <Select
              label="Unit of Measure"
              options={uoms.map((item) => ({
                value: item.symbol,
                label: `${item.name} (${item.symbol})`,
              }))}
              {...register("unitOfMeasure")}
            />
            <Select
              label="Product Type"
              options={[
                "finished_good",
                "raw_material",
                "semi_finished",
                "packaging",
                "service",
                "consumable",
              ].map((value) => ({ value, label: value }))}
              {...register("productType")}
            />
            <Input
              label="Sell Price"
              type="number"
              required
              {...register("basePrice")}
            />
            <Input
              label="Purchase Price"
              type="number"
              {...register("purchasePrice")}
            />
            <Select
              label="Mode"
              options={["manufactured", "trading", "service", "bundle"].map(
                (value) => ({ value, label: value }),
              )}
              {...register("type")}
            />
            <Select
              label="Status"
              options={statuses.map((value) => ({ value, label: value }))}
              {...register("status")}
            />
          </div>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing?._id ? "Update" : "Create"}
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
        title="Delete Product"
        message={`Delete "${deleting?.name}"? This is a soft delete.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

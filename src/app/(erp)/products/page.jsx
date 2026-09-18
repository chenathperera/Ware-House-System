"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Edit, Eye, Plus, Search, Trash2, Package } from "lucide-react";
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
  const [isView, setIsView] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const { data, isLoading, isFetching } = useProducts(filters);
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
  const formatPrice = (price) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(price || 0);
  const open = (product = null, view = false) => {
    setIsView(view);
    setEditing(product || {});
    reset({
      name: product?.name || "",
      sku: product?.sku || "",
      categoryId: product?.categoryId?._id || "",
      brandId: product?.brandId?._id || "",
      unitOfMeasure: product?.unitOfMeasure || "",
      basePrice: product?.basePrice || 0,
      purchasePrice:
        product?.purchasePrice || product?.costs?.standardCost || 0,
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
    {
      key: "productCode",
      label: "Code",
      width: "120px",
      render: (row) => (
        <span className="font-mono text-xs">{row.productCode}</span>
      ),
    },
    {
      key: "name",
      label: "Product",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.sku && <p className="text-xs text-gray-500">SKU: {row.sku}</p>}
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
      key: "purchasePrice",
      label: "Purchase Price",
      render: (row) => (
        <span className="font-medium">
          {formatPrice(row.purchasePrice || row.costs?.standardCost)}
        </span>
      ),
    },
    {
      key: "basePrice",
      label: "Sell Price",
      render: (row) => (
        <span className="font-medium text-primary-600">
          {formatPrice(row.basePrice)}
        </span>
      ),
    },
    {
      key: "callPrice",
      label: "Call Price",
      render: (row) =>
        row.callPrice > 0 ? (
          <div className="flex flex-col">
            <span className="font-medium text-amber-700">
              {formatPrice(row.callPrice)}
            </span>
            {row.callPriceUpdatedAt && (
              <span
                className="mt-0.5 text-[10px] text-gray-500"
                title="Call Price Last Updated"
              >
                {new Date(row.callPriceUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: "profit",
      label: "Profit (%)",
      render: (row) => {
        const cost = row.costs?.standardCost || 0;
        const price = row.basePrice || 0;
        if (cost <= 0) return <span className="text-gray-400">—</span>;
        const profit = (((price - cost) / cost) * 100).toFixed(1);
        return (
          <span
            className={`font-semibold ${+profit > 0 ? "text-green-600" : "text-red-600"}`}
          >
            {profit}%
          </span>
        );
      },
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
            <button
              onClick={(event) => {
                event.stopPropagation();
                open(row, true);
              }}
              className="rounded p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
              title="View"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                open(row);
              }}
              className="rounded p-1.5 text-gray-500 transition hover:bg-primary-50 hover:text-primary-600"
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(row);
              }}
              className="rounded p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
              title="Delete"
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
        <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
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
            disabled={isView}
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
            disabled={isView}
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
            description={
              filters.search || filters.categoryId || filters.status
                ? "Try adjusting your filters"
                : "Get started by adding your first product"
            }
            action={
              canManage &&
              !filters.search && (
                <Button variant="primary" onClick={() => open()}>
                  <Plus size={16} className="mr-1.5" />
                  Add Product
                </Button>
              )
            }
          />
        )}
        {isFetching && !isLoading && (
          <div className="pointer-events-none absolute inset-0 bg-white/30" />
        )}
      </Card>
      <Modal
        isOpen={editing !== null}
        onClose={() => {
          setEditing(null);
          setIsView(false);
        }}
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
        message={`Are you sure you want to delete "${deleting?.name}"? This action soft-deletes the product but can be restored by an admin.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

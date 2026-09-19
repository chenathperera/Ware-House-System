"use client";
import { useState } from "react";
import { Edit, Eye, Package, Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import ProductFormModal from "../../../client/features/products/ProductFormModal.jsx";
import {
  useCategories,
  useDeleteProduct,
  useProducts,
} from "../../../client/features/products/useProducts.js";
import { useAuthStore } from "../../../client/store/authStore.js";
const statusVariant = {
  active: "success",
  inactive: "default",
  draft: "warning",
  discontinued: "danger",
};

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isView, setIsView] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const { data, isLoading, isFetching } = useProducts(filters);
  const { data: categoriesData } = useCategories();
  const deleteProduct = useDeleteProduct();
  const products = data?.data || [];
  const categoryOptions = (categoriesData?.data || []).map((item) => ({
    value: item._id,
    label: item.name,
  }));
  const update = (change) =>
    setFilters((current) => ({ ...current, ...change }));
  const close = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setIsView(false);
  };
  const columns = productColumns({
    canManage,
    open: (product, view = false) => {
      setEditingProduct(product);
      setIsView(view);
      setIsFormOpen(true);
    },
    remove: setDeletingProduct,
  });
  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Add Product
            </Button>
          )
        }
      />
      <Card>
        <Filters
          filters={filters}
          update={update}
          options={categoryOptions}
          isView={isView}
        />
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">
            Loading products...
          </div>
        ) : products.length === 0 ? (
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
                <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                  <Plus size={16} className="mr-1.5" />
                  Add Product
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={columns} data={products} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              onPageChange={(page) => update({ page })}
            />
          </>
        )}
        {isFetching && !isLoading && (
          <div className="pointer-events-none absolute inset-0 bg-white/30" />
        )}
      </Card>
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={close}
        product={editingProduct}
      />
      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={async () => {
          await deleteProduct.mutateAsync(deletingProduct._id);
          setDeletingProduct(null);
        }}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action soft-deletes the product but can be restored by an admin.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteProduct.isPending}
      />
    </div>
  );
}
function Filters({ filters, update, options, isView }) {
  return (
    <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
      <div className="relative min-w-[200px] flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by name, SKU, code..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value, page: 1 })}
        />
      </div>
      <div className="w-48">
        <Select
          disabled={isView}
          placeholder="All Categories"
          options={options}
          value={filters.categoryId}
          onChange={(event) =>
            update({ categoryId: event.target.value, page: 1 })
          }
        />
      </div>
      <div className="w-40">
        <Select
          disabled={isView}
          placeholder="All Statuses"
          options={["active", "inactive", "draft", "discontinued"].map(
            (value) => ({ value, label: value }),
          )}
          value={filters.status}
          onChange={(event) => update({ status: event.target.value, page: 1 })}
        />
      </div>
    </div>
  );
}
function productColumns(actions) {
  const money = (value) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(value || 0);
  return [
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
          <p className="font-medium text-gray-900">{row.name}</p>
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
          {money(row.purchasePrice || row.costs?.standardCost)}
        </span>
      ),
    },
    {
      key: "basePrice",
      label: "Sell Price",
      render: (row) => (
        <span className="font-medium text-primary-600">
          {money(row.basePrice)}
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
              {money(row.callPrice)}
            </span>
            {row.callPriceUpdatedAt && (
              <span className="mt-0.5 text-[10px] text-gray-500">
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
        if (cost <= 0) return <span className="text-gray-400">—</span>;
        const profit = (((row.basePrice - cost) / cost) * 100).toFixed(1);
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
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (row) =>
        actions.canManage && (
          <div className="flex gap-1">
            <button
              onClick={(event) => {
                event.stopPropagation();
                actions.open(row, true);
              }}
              className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
              title="View"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                actions.open(row);
              }}
              className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                actions.remove(row);
              }}
              className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
    },
  ];
}

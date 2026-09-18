"use client";

import { useState } from "react";
import {
  AlertTriangle,
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
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import CustomerFormModal from "../../../client/features/customers/CustomerFormModal.jsx";
import {
  useCustomers,
  useCustomerGroups,
  useDeleteCustomer,
  useToggleCreditHold,
} from "../../../client/features/customers/useCustomers.js";
import { useAuthStore } from "../../../client/store/authStore.js";

const statusVariant = {
  active: "success",
  inactive: "default",
  prospect: "info",
  on_hold: "warning",
  blacklisted: "danger",
};
const statusOptions = [
  "active",
  "prospect",
  "on_hold",
  "inactive",
  "blacklisted",
].map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1).replace("_", " "),
}));

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [togglingHold, setTogglingHold] = useState(null);
  const [holdReason, setHoldReason] = useState("");
  const { data, isLoading } = useCustomers(filters);
  const { data: groupsData } = useCustomerGroups();
  const deleteMutation = useDeleteCustomer();
  const holdMutation = useToggleCreditHold();
  const customers = data?.data || [];
  const groupOptions = (groupsData?.data || []).map((group) => ({
    value: group._id,
    label: group.name,
  }));

  const columns = customerColumns({
    canManage,
    canDelete,
    canHoldCredit,
    setEditing,
    setIsFormOpen,
    setDeleting,
    setTogglingHold,
    setHoldReason,
  });
  function updateFilters(change) {
    setFilters((current) => ({ ...current, ...change }));
  }
  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
  }
  async function deleteCustomer() {
    await deleteMutation.mutateAsync(deleting._id);
    setDeleting(null);
  }
  async function toggleCreditHold() {
    await holdMutation.mutateAsync({
      id: togglingHold._id,
      reason: holdReason,
    });
    setTogglingHold(null);
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your wholesale customers"
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Add Customer
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
              type="text"
              placeholder="Search by name, code, or phone..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={filters.search}
              onChange={(event) =>
                updateFilters({ search: event.target.value, page: 1 })
              }
            />
          </div>
          <div className="w-48">
            <Select
              placeholder="All Groups"
              options={groupOptions}
              value={filters.customerGroupId}
              onChange={(event) =>
                updateFilters({ customerGroupId: event.target.value, page: 1 })
              }
            />
          </div>
          <div className="w-40">
            <Select
              placeholder="All Statuses"
              options={statusOptions}
              value={filters.status}
              onChange={(event) =>
                updateFilters({ status: event.target.value, page: 1 })
              }
            />
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={
              filters.search || filters.status
                ? "Try adjusting filters"
                : "Add your first customer to get started"
            }
            action={
              canManage &&
              !filters.search && (
                <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                  <Plus size={16} className="mr-1.5" />
                  Add Customer
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={columns} data={customers} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              onPageChange={(page) => updateFilters({ page })}
            />
          </>
        )}
      </Card>
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        customer={editing}
      />
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={deleteCustomer}
        title="Delete Customer"
        message={`Delete "${deleting?.displayName}"? This is a soft delete.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        isOpen={!!togglingHold}
        onClose={() => setTogglingHold(null)}
        onConfirm={toggleCreditHold}
        title={
          togglingHold?.creditStatus?.onCreditHold
            ? "Remove Credit Hold"
            : "Place on Credit Hold"
        }
        message={
          togglingHold?.creditStatus?.onCreditHold ? (
            `Remove credit hold for "${togglingHold?.displayName}"? They will be able to place orders again.`
          ) : (
            <div>
              <p className="mb-3">
                Place &quot;{togglingHold?.displayName}&quot; on credit hold?
              </p>
              <input
                type="text"
                placeholder="Reason (required)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={holdReason}
                onChange={(event) => setHoldReason(event.target.value)}
              />
            </div>
          )
        }
        confirmText={
          togglingHold?.creditStatus?.onCreditHold
            ? "Remove Hold"
            : "Place Hold"
        }
        variant={
          togglingHold?.creditStatus?.onCreditHold ? "primary" : "danger"
        }
        loading={holdMutation.isPending}
      />
    </div>
  );
}

function customerColumns(actions) {
  return [
    {
      key: "customerCode",
      label: "Code",
      width: "110px",
      render: (row) => (
        <span className="font-mono text-xs">{row.customerCode}</span>
      ),
    },
    {
      key: "displayName",
      label: "Customer",
      render: (row) => <CustomerName row={row} />,
    },
    {
      key: "customerGroupId",
      label: "Group",
      render: (row) =>
        row.customerGroupId ? (
          <span
            className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: row.customerGroupId.color || "#6b7280" }}
          >
            {row.customerGroupId.name}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
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
      key: "paymentTerms",
      label: "Terms",
      render: (row) => <Terms paymentTerms={row.paymentTerms} />,
    },
    {
      key: "creditStatus",
      label: "Outstanding",
      render: (row) => <Outstanding creditStatus={row.creditStatus} />,
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
      width: "140px",
      render: (row) => <RowActions row={row} {...actions} />,
    },
  ];
}

function CustomerName({ row }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-medium text-gray-900">
        {row.displayName}
        {row.creditStatus?.onCreditHold && (
          <span title="On credit hold">
            <Ban size={14} className="text-red-500" />
          </span>
        )}
        {row.creditStatus?.isOverdue && (
          <span title="Overdue">
            <AlertTriangle size={14} className="text-amber-500" />
          </span>
        )}
      </p>
      {row.companyName && row.companyName !== row.displayName && (
        <p className="text-xs text-gray-500">{row.companyName}</p>
      )}
    </div>
  );
}
function Terms({ paymentTerms }) {
  if (paymentTerms?.type === "credit")
    return <Badge variant="info">{paymentTerms.creditDays}d credit</Badge>;
  if (paymentTerms?.type === "advance")
    return <Badge variant="warning">Advance</Badge>;
  return <Badge>COD</Badge>;
}
function Outstanding({ creditStatus }) {
  const balance = creditStatus?.currentBalance || 0;
  if (!balance) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span
      className={
        creditStatus?.isOverdue ? "font-medium text-red-600" : "text-gray-900"
      }
    >
      LKR {new Intl.NumberFormat("en-LK").format(balance)}
    </span>
  );
}
function RowActions({
  row,
  canManage,
  canDelete,
  canHoldCredit,
  setEditing,
  setIsFormOpen,
  setDeleting,
  setTogglingHold,
  setHoldReason,
}) {
  return (
    <div className="flex gap-1">
      {canHoldCredit && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            setTogglingHold(row);
            setHoldReason("");
          }}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
          title={
            row.creditStatus?.onCreditHold
              ? "Remove credit hold"
              : "Place on credit hold"
          }
        >
          {row.creditStatus?.onCreditHold ? (
            <CheckCircle size={16} className="text-green-600" />
          ) : (
            <Ban size={16} />
          )}
        </button>
      )}
      {canManage && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            setEditing(row);
            setIsFormOpen(true);
          }}
          className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
          title="Edit"
        >
          <Edit size={16} />
        </button>
      )}
      {canDelete && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            setDeleting(row);
          }}
          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

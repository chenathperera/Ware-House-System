"use client";
import { useState } from "react";
import {
  Edit,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
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
import UserFormModal from "../../../client/features/users/UserFormModal.jsx";
import { ROLES, getRoleConfig } from "../../../client/features/users/roleConfig.js";
import { useDeleteUser, useUsers } from "../../../client/features/users/useUsers.js";
import { useAuthStore } from "../../../client/store/authStore.js";
import AdminVerificationModal from "../../../components/auth/AdminVerificationModal.jsx";
import { useAdminVerify } from "../../../client/features/auth/useAdminVerify.js";
import ProtectedRoute from "../../../components/auth/ProtectedRoute.jsx";
function UsersPage() {
  const current = useAuthStore((state) => state.user);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    isActive: "",
    page: 1,
    limit: 20,
  });
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const { data, isLoading } = useUsers(filters);
  const remove = useDeleteUser();
  const verify = useAdminVerify();
  const users = data?.data || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / filters.limit);
  const set = (value) => setFilters((old) => ({ ...old, ...value, page: value.page ?? 1 }));
  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.firstName} {row.lastName}
            {row._id === current?._id && (
              <Badge className="ml-2" variant="info">
                You
              </Badge>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <Mail size={10} />
            {row.email}
          </p>
          {row.phone && (
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <Phone size={10} />
              {row.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => {
        const role = getRoleConfig(row.role);
        return (
          <span
            className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: role.color }}
          >
            {role.label}
          </span>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      render: (row) =>
        row.isActive ? (
          <Badge variant="success">
            <ShieldCheck size={10} className="mr-1 inline" />
            Active
          </Badge>
        ) : (
          <Badge>
            <ShieldOff size={10} className="mr-1 inline" />
            Inactive
          </Badge>
        ),
    },
    {
      key: "lastLogin",
      label: "Last Login",
      render: (row) =>
        row.lastLoginAt ? (
          new Date(row.lastLoginAt).toLocaleDateString("en-LK")
        ) : (
          <span className="text-xs text-gray-400">Never</span>
        ),
    },
    {
      key: "createdAt",
      label: "Added",
      render: (row) => new Date(row.createdAt).toLocaleDateString("en-LK"),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (row) => (
        <div className="flex gap-1">
          <button
            onClick={(event) => {
              event.stopPropagation();
              setEditing(row);
              setForm(true);
            }}
            className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          {row._id !== current?._id && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setDeactivating(row);
              }}
              className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
              title="Deactivate"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];
  const active = users.filter((user) => user.isActive).length;
  const inactive = users.length - active;
  return (
    <>
      <PageHeader
        title="Users"
        description="Manage team members and their access levels"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setForm(true);
            }}
          >
            <Plus size={16} className="mr-1.5" />
            Add User
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-semibold">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-semibold text-green-600">{active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Inactive</p>
          <p className="text-2xl font-semibold text-gray-500">{inactive}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-2xl font-semibold text-red-600">{users.filter((user) => user.role === "admin").length}</p>
        </Card>
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(event) => set({ search: event.target.value })}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <Select
            options={ROLES.map(({ value, label }) => ({ value, label }))}
            value={filters.role}
            onChange={(event) => set({ role: event.target.value })}
            placeholder="All Roles"
          />
          <Select
            options={[
              { value: "true", label: "Active only" },
              { value: "false", label: "Inactive only" },
            ]}
            value={filters.isActive}
            onChange={(event) => set({ isActive: event.target.value })}
            placeholder="All"
          />
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading users...</div>
        ) : users.length ? (
          <>
            <Table columns={columns} data={users} />
            <Pagination
              page={filters.page}
              totalPages={pages}
              total={total}
              onPageChange={(page) => set({ page })}
            />
          </>
        ) : (
          <EmptyState
            icon={UserCog}
            title="No users"
            description="Add your first team member"
            action={
              <Button variant="primary" onClick={() => setForm(true)}>
                <Plus size={16} className="mr-1.5" /> Add User
              </Button>
            }
          />
        )}
      </Card>
      <UserFormModal isOpen={form} onClose={() => setForm(false)} user={editing} />
      <ConfirmDialog
        isOpen={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={async () => {
          await remove.mutateAsync(deactivating._id);
          setDeactivating(null);
        }}
        title="Deactivate User"
        message={
          <div>
            <p className="mb-2">
              Deactivate <strong>{deactivating?.firstName} {deactivating?.lastName}</strong>?
            </p>
            <p className="text-sm text-gray-600">
              They will no longer be able to log in. Their historical records (orders, approvals) remain intact.
            </p>
          </div>
        }
        confirmText="Deactivate"
        loading={remove.isPending}
      />
      <AdminVerificationModal
        isOpen={verify.isVerifyModalOpen}
        onClose={verify.closeVerifyModal}
        onVerified={verify.handleVerified}
        title={verify.verifyConfig.title}
        message={verify.verifyConfig.message}
      />
    </>
  );
}
export default function GuardedUsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <UsersPage />
    </ProtectedRoute>
  );
}

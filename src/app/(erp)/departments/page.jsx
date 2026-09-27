"use client";

import { useState } from "react";
import { Building2, Edit, Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Input from "../../../components/ui/Input.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import Select from "../../../components/ui/Select.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from "../../../client/features/hr/useHr.js";

const empty = {
  code: "",
  name: "",
  description: "",
  parentDepartmentId: "",
};

export default function DepartmentsPage() {
  const { data, isLoading } = useDepartments();
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const remove = useDeleteDepartment();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(empty);
  const departments = data?.data || [];

  const begin = (department, isView = false) => {
    setEditing(department);
    setView(isView);
    setForm(
      department
        ? {
            code: department.code,
            name: department.name,
            description: department.description || "",
            parentDepartmentId: department.parentDepartmentId?._id || "",
          }
        : empty,
    );
    setOpen(true);
  };

  const submit = async () => {
    if (!form.code || !form.name) {
      return toast.error("Code and name required");
    }

    const payload = {
      ...form,
      parentDepartmentId: form.parentDepartmentId || undefined,
    };

    if (editing) {
      await update.mutateAsync({ id: editing._id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }

    setOpen(false);
  };

  const confirmDelete = async () => {
    await remove.mutateAsync(deleting._id);
    setDeleting(null);
  };

  const parentDepartmentOptions = departments
    .filter((row) => row._id !== editing?._id)
    .map((row) => ({ value: row._id, label: row.name }));
  const modalTitle = editing
    ? view
      ? "View Department"
      : "Edit Department"
    : "New Department";

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      key: "name",
      label: "Name",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "parent",
      label: "Parent",
      render: (row) => row.parentDepartmentId?.name || "—",
    },
    {
      key: "manager",
      label: "Manager",
      render: (row) =>
        row.managerId
          ? `${row.managerId.firstName} ${row.managerId.lastName}`
          : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={row.isActive ? "success" : "default"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          <button
            onClick={() => begin(row, true)}
            className="rounded p-1.5 hover:bg-gray-100"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => begin(row)}
            className="rounded p-1.5 hover:bg-gray-100"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleting(row)}
            className="rounded p-1.5 text-red-600 hover:bg-red-50"
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
        title="Departments"
        description="Organizational units"
        actions={
          <Button variant="primary" onClick={() => begin(null)}>
            <Plus size={16} className="mr-1.5" />
            Add Department
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : departments.length ? (
          <Table columns={columns} data={departments} />
        ) : (
          <EmptyState
            icon={Building2}
            title="No departments"
            description="Add your first department"
            action={
              <Button variant="primary" onClick={() => begin(null)}>
                Add Department
              </Button>
            }
          />
        )}
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
      >
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              disabled={view}
              label="Code"
              required
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value.toUpperCase() })
              }
            />
            <Input
              disabled={view}
              label="Name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <Select
            disabled={view}
            label="Parent Department (optional)"
            placeholder="None"
            options={parentDepartmentOptions}
            value={form.parentDepartmentId}
            onChange={(event) =>
              setForm({ ...form, parentDepartmentId: event.target.value })
            }
          />
          <Textarea
            disabled={view}
            label="Description"
            rows={2}
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button
            variant={view ? "primary" : "outline"}
            onClick={() => setOpen(false)}
          >
            {view ? "Close" : "Cancel"}
          </Button>
          {!view && (
            <Button
              variant="primary"
              onClick={submit}
              loading={create.isPending || update.isPending}
            >
              {editing ? "Update" : "Create"}
            </Button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete Department"
        message={`Delete "${deleting?.name}"?`}
        variant="danger"
        loading={remove.isPending}
      />
    </div>
  );
}

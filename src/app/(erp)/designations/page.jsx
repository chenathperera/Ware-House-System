"use client";

import { useState } from "react";
import { Award, Edit, Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import {
  useCreateDesignation,
  useDeleteDesignation,
  useDepartments,
  useDesignations,
  useUpdateDesignation,
} from "../../../client/features/hr/useHr.js";

const blank = {
  code: "",
  name: "",
  departmentId: "",
  level: 1,
};

export default function DesignationsPage() {
  const { data, isLoading } = useDesignations();
  const { data: departmentsData } = useDepartments();
  const create = useCreateDesignation();
  const update = useUpdateDesignation();
  const remove = useDeleteDesignation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(blank);
  const list = data?.data || [];
  const departments = departmentsData?.data || [];

  const begin = (designation, isView = false) => {
    setEditing(designation);
    setView(isView);
    setForm(
      designation
        ? {
            code: designation.code,
            name: designation.name,
            departmentId: designation.departmentId?._id || "",
            level: designation.level || 1,
          }
        : blank,
    );
    setOpen(true);
  };

  const submit = async () => {
    if (!form.code || !form.name) {
      return toast.error("Code and name required");
    }

    const payload = {
      ...form,
      level: +form.level,
      departmentId: form.departmentId || undefined,
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

  const departmentOptions = departments.map((row) => ({
    value: row._id,
    label: row.name,
  }));
  const modalTitle = editing
    ? view
      ? "View Designation"
      : "Edit Designation"
    : "New Designation";

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
      key: "department",
      label: "Department",
      render: (row) => row.departmentId?.name || "—",
    },
    {
      key: "level",
      label: "Level",
      render: (row) => <Badge>Level {row.level}</Badge>,
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
        title="Designations"
        description="Job titles and position levels"
        actions={
          <Button variant="primary" onClick={() => begin(null)}>
            <Plus size={16} className="mr-1.5" />
            Add Designation
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : list.length ? (
          <Table columns={columns} data={list} />
        ) : (
          <EmptyState
            icon={Award}
            title="No designations"
            description="Add designations to organize job roles"
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
          <div className="grid grid-cols-2 gap-4">
            <Select
              disabled={view}
              label="Department"
              placeholder="None"
              options={departmentOptions}
              value={form.departmentId}
              onChange={(event) =>
                setForm({ ...form, departmentId: event.target.value })
              }
            />
            <Input
              disabled={view}
              label="Level"
              type="number"
              min="1"
              max="10"
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
            />
          </div>
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
        title="Delete Designation"
        message={`Delete "${deleting?.name}"?`}
        variant="danger"
        loading={remove.isPending}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Clock, Edit, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Table from "../../../components/ui/Table.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Input from "../../../components/ui/Input.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import {
  useCreateShift,
  useDeleteShift,
  useShifts,
  useUpdateShift,
} from "../../../client/features/hr/useHr.js";

const blank = {
  name: "",
  code: "",
  startTime: "08:00",
  endTime: "17:00",
  breakMinutes: 60,
  graceMinutes: 15,
};

export default function ShiftsPage() {
  const { data, isLoading } = useShifts();
  const create = useCreateShift();
  const update = useUpdateShift();
  const remove = useDeleteShift();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(blank);
  const shifts = data?.data || [];

  const change = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const begin = (shift) => {
    setEditing(shift);
    setForm(
      shift
        ? {
            name: shift.name,
            code: shift.code || "",
            startTime: shift.startTime,
            endTime: shift.endTime,
            breakMinutes: shift.breakMinutes,
            graceMinutes: shift.graceMinutes,
          }
        : blank,
    );
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name || !form.startTime || !form.endTime) {
      toast.error("Name and times required");
      return;
    }

    const payload = {
      ...form,
      breakMinutes: +form.breakMinutes,
      graceMinutes: +form.graceMinutes,
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

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: "code", label: "Code" },
    {
      key: "timing",
      label: "Timing",
      render: (row) => `${row.startTime} - ${row.endTime}`,
    },
    {
      key: "break",
      label: "Break",
      render: (row) => `${row.breakMinutes} min`,
    },
    {
      key: "working",
      label: "Working",
      render: (row) => `${(row.workingMinutes / 60).toFixed(1)} hrs`,
    },
    {
      key: "grace",
      label: "Grace",
      render: (row) => `${row.graceMinutes} min`,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1">
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
        title="Shifts"
        description="Work shift patterns"
        actions={
          <Button variant="primary" onClick={() => begin(null)}>
            <Plus size={16} className="mr-1.5" />
            Add Shift
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : shifts.length ? (
          <Table columns={columns} data={shifts} />
        ) : (
          <EmptyState
            icon={Clock}
            title="No shifts"
            description="Define work shift patterns"
          />
        )}
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Shift" : "New Shift"}
      >
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
            />
            <Input
              label="Code"
              value={form.code}
              onChange={(event) =>
                change("code", event.target.value.toUpperCase())
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              required
              type="time"
              value={form.startTime}
              onChange={(event) => change("startTime", event.target.value)}
            />
            <Input
              label="End Time"
              required
              type="time"
              value={form.endTime}
              onChange={(event) => change("endTime", event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Break (minutes)"
              type="number"
              min="0"
              value={form.breakMinutes}
              onChange={(event) => change("breakMinutes", event.target.value)}
            />
            <Input
              label="Grace (minutes late allowance)"
              type="number"
              min="0"
              value={form.graceMinutes}
              onChange={(event) => change("graceMinutes", event.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={create.isPending || update.isPending}
          >
            {editing ? "Update" : "Create"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete Shift"
        message={`Delete shift "${deleting?.name}"?`}
        variant="danger"
        loading={remove.isPending}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Edit, Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  useUpdateHoliday,
} from "../../../client/features/hr/useHr.js";

const holidayTypes = [
  { value: "public", label: "Public" },
  { value: "national", label: "National" },
  { value: "religious", label: "Religious" },
  { value: "poya", label: "Poya" },
  { value: "company", label: "Company" },
];

const emptyForm = { name: "", date: "", type: "public" };

export default function HolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [isOpen, setIsOpen] = useState(false);
  const [isView, setIsView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const holidaysQuery = useHolidays({ year });
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const holidays = holidaysQuery.data?.data || [];

  const closeModal = () => {
    setIsOpen(false);
    setIsView(false);
  };

  const openNew = () => {
    setIsView(false);
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openHoliday = (holiday, viewOnly) => {
    setIsView(viewOnly);
    setEditing(holiday);
    setForm({
      name: holiday.name,
      date: holiday.date.slice(0, 10),
      type: holiday.type,
    });
    setIsOpen(true);
  };

  const submit = async () => {
    if (!form.name || !form.date) {
      toast.error("Name and date required");
      return;
    }

    try {
      if (editing) {
        await updateHoliday.mutateAsync({ id: editing._id, data: form });
      } else {
        await createHoliday.mutateAsync(form);
      }
      setIsOpen(false);
    } catch {}
  };

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (holiday) =>
        new Date(holiday.date).toLocaleDateString("en-LK", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      key: "name",
      label: "Name",
      render: (holiday) => (
        <span className="font-medium">{holiday.name}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (holiday) => <Badge>{holiday.type}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (holiday) => (
        <div className="flex gap-1">
          <button
            onClick={() => openHoliday(holiday, true)}
            className="rounded p-1.5 hover:bg-gray-100"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openHoliday(holiday, false)}
            className="rounded p-1.5 hover:bg-gray-100"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleting(holiday)}
            className="rounded p-1.5 text-red-600 hover:bg-red-50"
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
        title="Holiday Calendar"
        description="Public and company holidays"
        actions={
          <Button variant="primary" onClick={openNew}>
            <Plus size={16} className="mr-1.5" />
            Add Holiday
          </Button>
        }
      />

      <Card>
        <div className="border-b p-4">
          <div className="w-32">
            <Input
              label="Filter Year"
              type="number"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
        </div>

        {holidays.length === 0 ? (
          <p className="py-16 text-center text-gray-500">
            No holidays in {year}
          </p>
        ) : (
          <Table columns={columns} data={holidays} />
        )}
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={
          editing ? (isView ? "View Holiday" : "Edit Holiday") : "New Holiday"
        }
        size="md"
      >
        <div className="space-y-4 p-6">
          <Input
            disabled={isView}
            label="Name"
            required
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              disabled={isView}
              label="Date"
              required
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
            />
            <Select
              disabled={isView}
              label="Type"
              options={holidayTypes}
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant={isView ? "primary" : "outline"} onClick={closeModal}>
            {isView ? "Close" : "Cancel"}
          </Button>
          {!isView && (
            <Button
              variant="primary"
              onClick={submit}
              loading={createHoliday.isPending || updateHoliday.isPending}
            >
              {editing ? "Update" : "Create"}
            </Button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteHoliday.mutateAsync(deleting._id);
          setDeleting(null);
        }}
        title="Delete Holiday"
        message={`Delete "${deleting?.name}"?`}
        variant="danger"
      />
    </div>
  );
}

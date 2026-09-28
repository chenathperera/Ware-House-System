"use client";

import { useState } from "react";
import { Ban, CheckCircle, Plane, Plus, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useAuthStore } from "../../../client/store/authStore.js";
import {
  useCreateLeave,
  useEmployees,
  useLeaveActions,
  useLeaves,
} from "../../../client/features/hr/useHr.js";

const statusVariant = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "default",
};

const leaveTypeOptions = [
  { value: "annual", label: "Annual" },
  { value: "sick", label: "Sick" },
  { value: "casual", label: "Casual" },
  { value: "maternity", label: "Maternity" },
  { value: "paternity", label: "Paternity" },
  { value: "unpaid", label: "Unpaid" },
  { value: "compensatory", label: "Compensatory" },
  { value: "bereavement", label: "Bereavement" },
];

const initialForm = {
  employeeId: "",
  leaveType: "annual",
  fromDate: "",
  toDate: "",
  isHalfDay: false,
  reason: "",
};

function LeaveActions({ leave, canApprove, onAction }) {
  const canCancel = ["pending", "approved"].includes(leave.status);

  return (
    <div className="flex gap-1">
      {leave.status === "pending" && canApprove ? (
        <>
          <button
            onClick={() => onAction("approve", leave)}
            className="rounded p-1.5 text-green-600 hover:bg-green-50"
            title="Approve"
          >
            <CheckCircle size={16} />
          </button>
          <button
            onClick={() => onAction("reject", leave)}
            className="rounded p-1.5 text-red-600 hover:bg-red-50"
            title="Reject"
          >
            <XCircle size={16} />
          </button>
        </>
      ) : null}
      {canCancel ? (
        <button
          onClick={() => onAction("cancel", leave)}
          className="rounded p-1.5 hover:bg-gray-100"
          title="Cancel"
        >
          <Ban size={16} />
        </button>
      ) : null}
    </div>
  );
}

export default function LeaveRequestsPage() {
  const user = useAuthStore((state) => state.user);
  const canApprove = ["admin", "manager"].includes(user?.role);
  const [filters, setFilters] = useState({ status: "", page: 1, limit: 20 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState(initialForm);
  const leavesQuery = useLeaves(filters);
  const employeesQuery = useEmployees({ status: "active", limit: 500 });
  const createLeave = useCreateLeave();
  const actions = useLeaveActions();
  const leaves = leavesQuery.data?.data || [];
  const employeeOptions = (employeesQuery.data?.data || []).map((employee) => ({
    value: employee._id,
    label: `${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
  }));

  const setFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setStatusFilter = (status) => {
    setFilters((current) => ({ ...current, status, page: 1 }));
  };

  const computeDays = () => {
    if (!form.fromDate || !form.toDate) return 0;
    if (form.isHalfDay) return 0.5;
    return Math.floor((new Date(form.toDate) - new Date(form.fromDate)) / 86400000) + 1;
  };

  const submitLeave = async () => {
    if (!form.employeeId || !form.fromDate || !form.toDate || !form.reason) {
      toast.error("All fields required");
      return;
    }

    try {
      await createLeave.mutateAsync(form);
      setIsFormOpen(false);
      setForm(initialForm);
    } catch {}
  };

  const openAction = (type, leave) => {
    setActionModal({ type, leave });
  };

  const closeAction = () => {
    setActionModal(null);
    setRejectReason("");
  };

  const submitAction = async () => {
    const { type, leave } = actionModal;

    try {
      if (type === "approve") await actions.approve.mutateAsync(leave._id);
      else if (type === "reject") await actions.reject.mutateAsync({ id: leave._id, reason: rejectReason });
      else if (type === "cancel") await actions.cancel.mutateAsync(leave._id);
      closeAction();
    } catch {}
  };

  const columns = [
    {
      key: "leaveNumber",
      label: "Ref",
      render: (leave) => <span className="font-mono text-xs">{leave.leaveNumber}</span>,
    },
    {
      key: "employee",
      label: "Employee",
      render: (leave) => (
        <div>
          <p className="text-sm font-medium">{leave.employeeName}</p>
          <p className="font-mono text-xs text-gray-500">{leave.employeeCode}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (leave) => <Badge>{leave.leaveType}</Badge>,
    },
    {
      key: "dates",
      label: "Dates",
      render: (leave) => (
        <div>
          <p className="text-sm">
            {new Date(leave.fromDate).toLocaleDateString("en-LK")} — {new Date(leave.toDate).toLocaleDateString("en-LK")}
          </p>
          <p className="text-xs text-gray-500">
            {leave.numberOfDays} day{leave.numberOfDays > 1 ? "s" : ""}{leave.isHalfDay ? " (half)" : ""}
          </p>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (leave) => <span className="block max-w-xs truncate text-sm">{leave.reason}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (leave) => <Badge variant={statusVariant[leave.status]}>{leave.status}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (leave) => (
        <LeaveActions
          leave={leave}
          canApprove={canApprove}
          onAction={openAction}
        />
      ),
    },
  ];

  const actionTitle = actionModal?.type === "approve" ? "Approve Leave" : actionModal?.type === "reject" ? "Reject Leave" : "Cancel Leave";
  const actionMessage = actionModal?.type === "approve" ? `Approve ${actionModal?.leave?.numberOfDays} day(s) of ${actionModal?.leave?.leaveType} leave for ${actionModal?.leave?.employeeName}?` : "Cancel this leave request?";

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        description="Manage employee leave applications"
        actions={
          <Button variant="primary" onClick={() => setIsFormOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Request Leave
          </Button>
        }
      />

      <Card>
        <div className="flex gap-3 border-b p-4">
          <div className="w-48">
            <Select
              placeholder="All Statuses"
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              value={filters.status}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
          </div>
        </div>

        {leaves.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No leave requests"
            description="Submit a leave request"
          />
        ) : (
          <>
            <Table columns={columns} data={leaves} />
            <Pagination
              page={filters.page}
              totalPages={leavesQuery.data?.totalPages || 1}
              total={leavesQuery.data?.total || 0}
              onPageChange={(page) =>
                setFilters((current) => ({ ...current, page }))
              }
            />
          </>
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="New Leave Request"
        size="md"
      >
        <div className="space-y-4 p-6">
          <Select
            label="Employee"
            required
            placeholder="Select..."
            options={employeeOptions}
            value={form.employeeId}
            onChange={(event) => setFormField("employeeId", event.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Leave Type"
              options={leaveTypeOptions}
              value={form.leaveType}
              onChange={(event) => setFormField("leaveType", event.target.value)}
            />
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isHalfDay}
                  onChange={(event) =>
                    setFormField("isHalfDay", event.target.checked)
                  }
                />
                Half day
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Date"
              required
              type="date"
              value={form.fromDate}
              onChange={(event) => setFormField("fromDate", event.target.value)}
            />
            <Input
              label="To Date"
              required
              type="date"
              value={form.toDate}
              onChange={(event) => setFormField("toDate", event.target.value)}
            />
          </div>

          <p className="text-sm">
            Total days: <strong>{computeDays()}</strong>
          </p>

          <Textarea
            label="Reason"
            required
            rows={3}
            value={form.reason}
            onChange={(event) => setFormField("reason", event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submitLeave}
            loading={createLeave.isPending}
          >
            Submit
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!actionModal}
        onClose={closeAction}
        title={actionTitle}
        size="md"
      >
        <div className="space-y-4 p-6">
          {actionModal?.type === "reject" ? (
            <Textarea
              label="Rejection Reason"
              required
              rows={3}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          ) : (
            <p>{actionMessage}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={closeAction}>
            Close
          </Button>
          <Button
            variant={actionModal?.type === "reject" ? "danger" : "primary"}
            onClick={submitAction}
            loading={
              actions.approve.isPending ||
              actions.reject.isPending ||
              actions.cancel.isPending
            }
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

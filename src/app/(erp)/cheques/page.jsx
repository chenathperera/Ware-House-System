"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  FileCheck,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { useBankAccounts } from "../../../client/features/bankAccounts/useBankAccounts.js";
import {
  useCheques,
  useDeleteCheque,
  useUpdateChequeStatus,
} from "../../../client/features/cheques/useCheques.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value || 0);

function statusBadgeVariant(status) {
  if (status === "cleared") {
    return "success";
  }
  if (status === "bounced") {
    return "danger";
  }
  return "info";
}

export default function ChequesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: "",
    direction: "",
    search: "",
    page: 1,
    limit: 15,
  });
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusDate, setStatusDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [bouncedReason, setBouncedReason] = useState("");
  const [depositedBankAccountId, setDepositedBankAccountId] = useState("");
  const { data: bankAccountsData } = useBankAccounts();
  const { data, isLoading } = useCheques(filters);
  const updateStatusMutation = useUpdateChequeStatus();
  const deleteMutation = useDeleteCheque();
  const bankAccounts = bankAccountsData?.data || [];
  const bankOptions = bankAccounts.map((account) => ({
    value: account._id,
    label: `${account.accountName} (${account.bankName})`,
  }));
  const cheques = data?.data || [];
  const pendingCount = cheques.filter(
    (cheque) => cheque.status === "pending",
  ).length;
  const clearedCount = cheques.filter(
    (cheque) => cheque.status === "cleared",
  ).length;
  const bouncedCount = cheques.filter(
    (cheque) => cheque.status === "bounced",
  ).length;
  const incomingCount = cheques.filter(
    (cheque) => cheque.direction === "incoming",
  ).length;

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const openStatusModal = (cheque) => {
    setStatusModal(cheque);
    setNewStatus(cheque.status);
  };

  const confirmDelete = (cheque) => {
    if (window.confirm("Delete this cheque record?")) {
      deleteMutation.mutate(cheque._id);
    }
  };

  const handleUpdateStatus = () => {
    const payload = { status: newStatus };

    if (newStatus === "cleared") {
      payload.clearedDate = statusDate;
      payload.depositedBankAccountId = depositedBankAccountId;
    }
    if (newStatus === "bounced") {
      payload.bouncedDate = statusDate;
      payload.bouncedReason = bouncedReason;
    }

    updateStatusMutation.mutate(
      { id: statusModal._id, data: payload },
      { onSuccess: () => setStatusModal(null) },
    );
  };

  const columns = [
    {
      key: "chequeNumber",
      label: "Cheque #",
      render: (cheque) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-gray-700">
            {cheque.chequeNumber}
          </span>
          {cheque.paymentId && (
            <button
              onClick={() =>
                router.push(`/payments/${cheque.paymentId?._id || cheque.paymentId}`)
              }
              className="rounded p-1 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
              title="View Payment"
            >
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      ),
    },
    {
      key: "chequeDate",
      label: "Date",
      render: (cheque) => new Date(cheque.chequeDate).toLocaleDateString(),
    },
    {
      key: "party",
      label: "Party",
      render: (cheque) =>
        cheque.payeeName ||
        cheque.customerId?.displayName ||
        cheque.supplierId?.displayName ||
        "—",
    },
    {
      key: "bank",
      label: "Bank",
      render: (cheque) => (
        <div>
          <p className="text-sm">{cheque.bankName}</p>
          <p className="text-xs text-gray-500">{cheque.branchName}</p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (cheque) => (
        <span className="font-bold">{formatCurrency(cheque.amount)}</span>
      ),
    },
    {
      key: "direction",
      label: "Type",
      render: (cheque) => (
        <Badge
          variant={cheque.direction === "incoming" ? "success" : "warning"}
        >
          {cheque.direction}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (cheque) => (
        <Badge variant={statusBadgeVariant(cheque.status)}>
          {cheque.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (cheque) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openStatusModal(cheque)}
          >
            Update Status
          </Button>
          <button
            onClick={() => confirmDelete(cheque)}
            className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete Cheque"
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cheque Management"
        description="Track and manage incoming and outgoing cheques"
        icon={FileCheck}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard
          icon={Clock}
          iconClassName="bg-blue-50 text-blue-600"
          label="Pending"
          value={pendingCount}
        />
        <SummaryCard
          icon={CheckCircle}
          iconClassName="bg-green-50 text-green-600"
          label="Cleared"
          value={clearedCount}
        />
        <SummaryCard
          icon={XCircle}
          iconClassName="bg-red-50 text-red-600"
          label="Bounced"
          value={bouncedCount}
        />
        <SummaryCard
          icon={AlertCircle}
          iconClassName="bg-amber-50 text-amber-600"
          label="Incoming"
          value={incomingCount}
        />
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 border-b p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search cheques..."
              className="w-full rounded-lg border py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <Select
            className="w-40"
            options={[
              { value: "", label: "All Statuses" },
              { value: "pending", label: "Pending" },
              { value: "cleared", label: "Cleared" },
              { value: "bounced", label: "Bounced" },
            ]}
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          />
          <Select
            className="w-40"
            options={[
              { value: "", label: "All Types" },
              { value: "incoming", label: "Incoming" },
              { value: "outgoing", label: "Outgoing" },
            ]}
            value={filters.direction}
            onChange={(event) => updateFilter("direction", event.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-gray-500">Loading cheques...</div>
        ) : (
          <Table columns={columns} data={cheques} />
        )}
      </Card>

      <Modal
        isOpen={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`Update Cheque — ${statusModal?.chequeNumber}`}
        size="sm"
      >
        <div className="space-y-4 p-6">
          <Select
            label="New Status"
            options={[
              { value: "pending", label: "Pending" },
              { value: "cleared", label: "Cleared" },
              { value: "bounced", label: "Bounced" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={newStatus}
            onChange={(event) => setNewStatus(event.target.value)}
          />

          {(newStatus === "cleared" || newStatus === "bounced") && (
            <Input
              label={newStatus === "cleared" ? "Cleared Date" : "Bounced Date"}
              type="date"
              value={statusDate}
              onChange={(event) => setStatusDate(event.target.value)}
            />
          )}

          {newStatus === "cleared" && (
            <Select
              label="Deposit To Account"
              required
              placeholder="Select bank account..."
              options={bankOptions}
              value={depositedBankAccountId}
              onChange={(event) => setDepositedBankAccountId(event.target.value)}
            />
          )}

          {newStatus === "bounced" && (
            <Input
              label="Reason for Bouncing"
              placeholder="e.g., Insufficient funds"
              value={bouncedReason}
              onChange={(event) => setBouncedReason(event.target.value)}
            />
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={handleUpdateStatus}
              loading={updateStatusMutation.isPending}
            >
              Update Status
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => setStatusModal(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ icon: Icon, iconClassName, label, value }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`rounded-xl p-3 ${iconClassName}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

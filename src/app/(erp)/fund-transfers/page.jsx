"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  Edit2,
  Plus,
  Trash2,
} from "lucide-react";
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
  useCreateFundTransfer,
  useDeleteFundTransfer,
  useFundTransfers,
  useUpdateFundTransfer,
} from "../../../client/features/fundTransfers/useFundTransfers.js";
import toast from "react-hot-toast";

const emptyForm = {
  fromBankAccountId: "",
  toBankAccountId: "",
  amount: "",
  reference: "",
  notes: "",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value || 0);

export default function FundTransfersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const { data: accountsData } = useBankAccounts();
  const { data, isLoading } = useFundTransfers();
  const createMutation = useCreateFundTransfer();
  const deleteMutation = useDeleteFundTransfer();
  const updateMutation = useUpdateFundTransfer();
  const accounts = accountsData?.data || [];
  const transfers = data?.data || [];

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const openEdit = (transfer) => {
    setEditingId(transfer._id);
    setFormData({
      fromBankAccountId:
        transfer.fromBankAccountId?._id || transfer.fromBankAccountId,
      toBankAccountId: transfer.toBankAccountId?._id || transfer.toBankAccountId,
      amount: transfer.amount,
      reference: transfer.reference || "",
      notes: transfer.notes || "",
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (transfer) => {
    if (window.confirm("Reverse this transfer?")) {
      deleteMutation.mutate(transfer._id);
    }
  };

  const handleSubmit = () => {
    if (
      !formData.fromBankAccountId ||
      !formData.toBankAccountId ||
      !formData.amount
    ) {
      return toast.error("Please fill all required fields");
    }

    if (formData.fromBankAccountId === formData.toBankAccountId) {
      return toast.error("Source and destination accounts must be different");
    }

    createMutation.mutate(
      { ...formData, amount: +formData.amount },
      { onSuccess: closeModal },
    );
  };

  const saveTransfer = () => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: formData },
        { onSuccess: closeModal },
      );
      return;
    }

    handleSubmit();
  };

  const columns = [
    {
      key: "transferNumber",
      label: "Ref #",
      render: (transfer) => (
        <span className="font-mono font-bold">{transfer.transferNumber}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (transfer) => new Date(transfer.transferDate).toLocaleDateString(),
    },
    {
      key: "from",
      label: "From Account",
      render: (transfer) => (
        <div>
          <p className="font-medium">
            {transfer.fromBankAccountId?.accountName}
          </p>
          <Badge variant="default" className="text-[10px] uppercase">
            {transfer.fromBankAccountId?.category}
          </Badge>
        </div>
      ),
    },
    {
      key: "arrow",
      label: "",
      render: () => <ArrowRightLeft size={16} className="text-gray-400" />,
    },
    {
      key: "to",
      label: "To Account",
      render: (transfer) => (
        <div>
          <p className="font-medium">{transfer.toBankAccountId?.accountName}</p>
          <Badge variant="default" className="text-[10px] uppercase">
            {transfer.toBankAccountId?.category}
          </Badge>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (transfer) => (
        <span className="font-bold text-primary-600">
          {formatCurrency(transfer.amount)}
        </span>
      ),
    },
    {
      key: "reference",
      label: "Reference",
      render: (transfer) => transfer.reference || "—",
    },
    {
      key: "actions",
      label: "",
      render: (transfer) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openEdit(transfer)}
            className="rounded p-1 text-primary-400 hover:bg-primary-50 hover:text-primary-600"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => confirmDelete(transfer)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
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
        title="Fund Transfers"
        description="Transfer money between your bank accounts"
        icon={ArrowRightLeft}
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            New Transfer
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="py-20 text-center">Loading transfers...</div>
        ) : (
          <Table columns={columns} data={transfers} />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Fund Transfer" : "New Fund Transfer"}
        size="md"
      >
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Select source and destination accounts to move funds.
          </div>

          <Select
            label="From Account"
            required
            options={accounts.map((account) => ({
              value: account._id,
              label: `${account.accountName} (${account.category.toUpperCase()} - Balance: ${formatCurrency(account.currentBalance)})`,
            }))}
            value={formData.fromBankAccountId}
            onChange={(event) =>
              updateField("fromBankAccountId", event.target.value)
            }
            disabled={!!editingId}
          />

          <Select
            label="To Account"
            required
            options={accounts.map((account) => ({
              value: account._id,
              label: `${account.accountName} (${account.category.toUpperCase()})`,
            }))}
            value={formData.toBankAccountId}
            onChange={(event) => updateField("toBankAccountId", event.target.value)}
            disabled={!!editingId}
          />

          <Input
            label="Amount to Transfer"
            required
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            disabled={!!editingId}
          />

          <Input
            label="Reference"
            placeholder="e.g., Monthly saving transfer"
            value={formData.reference}
            onChange={(event) => updateField("reference", event.target.value)}
          />

          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={saveTransfer}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Update Transfer" : "Execute Transfer"}
            </Button>
            <Button variant="outline" fullWidth onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

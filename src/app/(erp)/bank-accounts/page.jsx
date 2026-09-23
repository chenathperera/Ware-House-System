"use client";

import { useState } from "react";
import {
  CreditCard,
  Edit2,
  Eye,
  History,
  Landmark,
  PiggyBank,
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
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
  useUpdateBankAccount,
} from "../../../client/features/bankAccounts/useBankAccounts.js";

const emptyForm = {
  accountName: "",
  accountNumber: "",
  bankName: "",
  branchName: "",
  category: "received",
  currentBalance: 0,
};

const categoryIcons = {
  received: { icon: CreditCard, color: "text-green-600", bg: "bg-green-50" },
  payment: { icon: History, color: "text-blue-600", bg: "bg-blue-50" },
  saving: { icon: PiggyBank, color: "text-amber-600", bg: "bg-amber-50" },
};

const formatCurrency = (value) => new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
}).format(value || 0);

function accountForm(account) {
  return {
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    bankName: account.bankName,
    branchName: account.branchName,
    category: account.category,
    currentBalance: account.currentBalance || 0,
  };
}

function CategoryIcon({ category }) {
  const config = categoryIcons[category];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg p-1.5 ${config.bg} ${config.color}`}>
      <Icon size={16} />
    </div>
  );
}

export default function BankAccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isView, setIsView] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const { data, isLoading } = useBankAccounts();
  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount();
  const deleteMutation = useDeleteBankAccount();
  const accounts = data?.data || [];

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setIsView(false);
    setFormData(emptyForm);
  };

  const openCreate = () => {
    setIsView(false);
    setIsModalOpen(true);
  };

  const openView = (account) => {
    setIsView(true);
    setEditingId(account._id);
    setFormData(accountForm(account));
    setIsModalOpen(true);
  };

  const openEdit = (account) => {
    setIsView(false);
    setEditingId(account._id);
    setFormData(accountForm(account));
    setIsModalOpen(true);
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const saveAccount = () => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: formData },
        { onSuccess: closeModal },
      );
      return;
    }

    createMutation.mutate(formData, { onSuccess: closeModal });
  };

  const confirmDelete = (account) => {
    if (window.confirm(`Delete ${account.accountName}?`)) {
      deleteMutation.mutate(account._id);
    }
  };

  const columns = [
    {
      key: "category",
      label: "Category",
      render: (account) => (
        <div className="flex items-center gap-2">
          <CategoryIcon category={account.category} />
          <span className="text-xs font-bold capitalize">{account.category}</span>
        </div>
      ),
    },
    {
      key: "bankName",
      label: "Bank",
      render: (account) => (
        <div>
          <p className="font-bold text-gray-900">{account.bankName}</p>
          <p className="text-xs text-gray-500">{account.branchName}</p>
        </div>
      ),
    },
    { key: "accountName", label: "Account Name" },
    {
      key: "accountNumber",
      label: "Account Number",
      render: (account) => (
        <span className="font-mono text-gray-600">{account.accountNumber}</span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      render: (account) => (
        <span className="font-bold text-gray-900">
          {formatCurrency(account.currentBalance)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (account) => (
        <Badge variant={account.isActive ? "success" : "default"}>
          {account.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (account) => (
        <div className="flex justify-end gap-1">
          <ActionButton label="View" onClick={() => openView(account)}>
            <Eye size={16} />
          </ActionButton>
          <ActionButton
            label="Edit"
            onClick={() => openEdit(account)}
            className="text-primary-600 hover:bg-primary-50"
          >
            <Edit2 size={16} />
          </ActionButton>
          <ActionButton
            label="Delete"
            onClick={() => confirmDelete(account)}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </ActionButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Accounts"
        description="Manage Received, Payment, and Saving bank accounts"
        icon={Landmark}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Add Account
          </Button>
        }
      />

      <CategoryTotals accounts={accounts} />

      <div className="hidden md:block">
        <Card>
          {isLoading ? (
            <div className="py-20 text-center text-gray-500">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <EmptyAccounts className="m-4" onCreate={openCreate} />
          ) : (
            <Table columns={columns} data={accounts} />
          )}
        </Card>
      </div>

      <div className="block space-y-4 md:hidden">
        {isLoading ? (
          <Card className="p-6 text-center text-gray-500">Loading accounts...</Card>
        ) : accounts.length === 0 ? (
          <Card>
            <EmptyAccounts className="p-6" onCreate={openCreate} compact />
          </Card>
        ) : (
          accounts.map((account) => (
            <MobileAccountCard
              key={account._id}
              account={account}
              onView={openView}
              onEdit={openEdit}
              onDelete={confirmDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>

      <AccountModal
        formData={formData}
        isOpen={isModalOpen}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isView={isView}
        editingId={editingId}
        onChange={updateField}
        onClose={closeModal}
        onSave={saveAccount}
      />
    </div>
  );
}

function ActionButton({ children, className = "", label, ...props }) {
  return (
    <button
      {...props}
      title={label}
      className={`rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 ${className}`}
    >
      {children}
    </button>
  );
}

function CategoryTotals({ accounts }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      {["received", "payment", "saving"].map((category) => {
        const config = categoryIcons[category];
        const Icon = config.icon;
        const categoryAccounts = accounts.filter((account) => account.category === category);
        const total = categoryAccounts.reduce(
          (sum, account) => sum + account.currentBalance,
          0,
        );

        return (
          <Card key={category} className="group relative overflow-hidden p-4 sm:p-6">
            <div
              className={`absolute -mr-4 -mt-4 right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20 sm:-mr-8 sm:-mt-8 sm:p-8 ${config.color}`}
            >
              <Icon className="h-16 w-16 sm:h-20 sm:w-20" />
            </div>
            <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
              {category} Accounts
            </p>
            <h3 className="mb-2 text-xl font-black text-gray-900 sm:mb-4 sm:text-2xl">
              {formatCurrency(total)}
            </h3>
            <div className="flex items-center justify-between text-2xs font-medium sm:text-xs">
              <span className="text-gray-500">{categoryAccounts.length} active</span>
              <Badge variant="info" className="capitalize">
                {category}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function EmptyAccounts({ className, compact = false, onCreate }) {
  return (
    <div className={`${className} border-2 border-dashed border-gray-100 text-center ${compact ? "rounded-xl" : "rounded-xl py-20"}`}>
      <Landmark
        size={compact ? 40 : 48}
        className={`mx-auto text-gray-200 ${compact ? "mb-2" : "mb-4"}`}
      />
      <h3 className="font-bold text-gray-900">No bank accounts added</h3>
      <p className={`text-gray-500 ${compact ? "mt-1 text-xs" : "text-sm"}`}>
        Add your first bank account to start tracking balances.
      </p>
      <Button
        variant="primary"
        className={compact ? "mt-3 px-3 py-1.5 text-xs" : "mt-4"}
        onClick={onCreate}
      >
        Add Account
      </Button>
    </div>
  );
}

function MobileAccountCard({ account, isDeleting, onDelete, onEdit, onView }) {
  return (
    <Card className="space-y-3 border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon category={account.category} />
          <span className="text-xs font-bold capitalize text-gray-700">
            {account.category}
          </span>
        </div>
        <Badge
          variant={account.isActive ? "success" : "default"}
          className="px-2 py-0.5 text-2xs"
        >
          {account.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-bold text-gray-900">{account.bankName}</h4>
        {account.branchName && (
          <p className="text-xs text-gray-500">{account.branchName} Branch</p>
        )}
        <div className="flex flex-col gap-0.5 pt-1">
          <p className="text-xs text-gray-600">
            <span className="font-medium text-gray-400">Name:</span> {account.accountName}
          </p>
          <p className="font-mono text-xs text-gray-600">
            <span className="font-sans font-medium text-gray-400">No:</span> {account.accountNumber}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <div className="flex flex-col">
          <span className="text-3xs font-bold uppercase tracking-wider text-gray-400">
            Balance
          </span>
          <span className="text-base font-black text-gray-900">
            {formatCurrency(account.currentBalance)}
          </span>
        </div>
        <div className="flex gap-1">
          <ActionButton
            label="View"
            onClick={() => onView(account)}
            className="border border-gray-100 p-2"
          >
            <Eye size={16} />
          </ActionButton>
          <ActionButton
            label="Edit"
            onClick={() => onEdit(account)}
            className="border border-primary-50 p-2 text-primary-600 hover:bg-primary-50"
          >
            <Edit2 size={16} />
          </ActionButton>
          <ActionButton
            label="Delete"
            onClick={() => onDelete(account)}
            disabled={isDeleting}
            className="border border-red-50 p-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </ActionButton>
        </div>
      </div>
    </Card>
  );
}

function AccountModal({
  editingId,
  formData,
  isOpen,
  isSaving,
  isView,
  onChange,
  onClose,
  onSave,
}) {
  const title = editingId
    ? isView ? "View Bank Account" : "Edit Bank Account"
    : "Add Bank Account";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4 p-6">
        <Select
          disabled={isView}
          label="Account Category"
          required
          options={[
            { value: "received", label: "Received Bank Account" },
            { value: "payment", label: "Payment Bank Account" },
            { value: "saving", label: "Saving Bank Account" },
          ]}
          value={formData.category}
          onChange={(event) => onChange("category", event.target.value)}
        />
        <Input
          disabled={isView}
          label="Bank Name"
          required
          placeholder="e.g., Bank of Ceylon"
          value={formData.bankName}
          onChange={(event) => onChange("bankName", event.target.value)}
        />
        <Input
          disabled={isView}
          label="Branch Name"
          placeholder="e.g., Colombo Main"
          value={formData.branchName}
          onChange={(event) => onChange("branchName", event.target.value)}
        />
        <Input
          disabled={isView}
          label="Account Name"
          required
          placeholder="e.g., Rishan Wholesale Main"
          value={formData.accountName}
          onChange={(event) => onChange("accountName", event.target.value)}
        />
        <Input
          disabled={isView}
          label="Account Number"
          required
          placeholder="e.g., 0012345678"
          value={formData.accountNumber}
          onChange={(event) => onChange("accountNumber", event.target.value)}
        />
        <Input
          disabled={isView}
          type="number"
          label="Current Balance (LKR)"
          placeholder="e.g., 50000"
          value={formData.currentBalance}
          onChange={(event) => onChange("currentBalance", Number(event.target.value) || 0)}
        />
        <div className="flex gap-2 pt-4">
          {!isView && (
            <Button variant="primary" fullWidth onClick={onSave} loading={isSaving}>
              {editingId ? "Update Account" : "Save Account"}
            </Button>
          )}
          <Button
            variant={isView ? "primary" : "outline"}
            fullWidth
            onClick={onClose}
          >
            {isView ? "Close" : "Cancel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

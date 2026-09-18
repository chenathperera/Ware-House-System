"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import {
  useCreateCustomer,
  useCustomerGroups,
  useUpdateCustomer,
} from "./useCustomers.js";
import {
  emptyQuickCustomerForm,
  hydrateQuickCustomerForm,
  toQuickCustomerPayload,
} from "./quickCustomerState.js";

export default function QuickCreateCustomerModal({
  isOpen,
  onClose,
  onCreated,
  initialData = null,
  isPosMode = false,
}) {
  const [form, setForm] = useState(emptyQuickCustomerForm);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const { data: groupsData } = useCustomerGroups({ isActive: "true" });

  useEffect(() => {
    // The original modal deliberately initializes/reinitializes form state on open.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialData && isOpen) setForm(hydrateQuickCustomerForm(initialData));
    else if (!isOpen) setForm({ ...emptyQuickCustomerForm });
  }, [initialData, isOpen]);

  function change(name) {
    return (event) =>
      setForm((current) => ({ ...current, [name]: event.target.value }));
  }

  async function submit() {
    if (!form.displayName) return toast.error("Customer name required");
    if (!form.phone && !form.email)
      return toast.error("Phone or email required");
    try {
      const payload = toQuickCustomerPayload(form);
      const result = initialData
        ? await updateMutation.mutateAsync({
            id: initialData._id,
            data: payload,
          })
        : await createMutation.mutateAsync(payload);
      toast.success(
        initialData
          ? "Customer updated"
          : "Customer created — you can complete details later",
      );
      onCreated?.(result.data);
      onClose();
    } catch {}
  }

  const groups = groupsData?.data || [];
  const isPending = createMutation.isPending || updateMutation.isPending;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Customer" : "Quick Create Customer"}
      size="md"
    >
      <div className="space-y-4 p-6">
        <p className="rounded bg-blue-50 p-2 text-xs text-blue-700">
          Capture the basics now. You can add full address, contacts, tax info,
          and credit details from the Customers page later.
        </p>
        <Input
          label="Display Name"
          required
          placeholder="ABC Trading"
          value={form.displayName}
          onChange={change("displayName")}
        />
        <Input
          label="Phone"
          placeholder="07X XXX XXXX"
          value={form.phone}
          onChange={change("phone")}
        />
        {!isPosMode && (
          <>
            <Input
              label="Legal Name (optional)"
              placeholder="Same as display name"
              value={form.legalName}
              onChange={change("legalName")}
            />
            <Select
              label="Customer Group"
              placeholder="None"
              options={groups.map((group) => ({
                value: group._id,
                label: group.name,
              }))}
              value={form.customerGroupId}
              onChange={change("customerGroupId")}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={change("email")}
            />
            <Input
              label="Address Line 1 (optional)"
              value={form.addressLine1}
              onChange={change("addressLine1")}
            />
            <Input
              label="City (optional)"
              value={form.city}
              onChange={change("city")}
            />
            <Select
              label="Payment Terms"
              options={[
                { value: "cash", label: "Cash on delivery" },
                { value: "credit", label: "Credit" },
              ]}
              value={form.paymentTermsType}
              onChange={change("paymentTermsType")}
            />
            {form.paymentTermsType === "credit" && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Credit Limit (LKR)"
                  type="number"
                  min="0"
                  value={form.creditLimit}
                  onChange={change("creditLimit")}
                />
                <Input
                  label="Credit Days"
                  type="number"
                  min="0"
                  value={form.creditDays}
                  onChange={change("creditDays")}
                />
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} loading={isPending}>
          {initialData ? "Save Changes" : "Create Customer"}
        </Button>
      </div>
    </Modal>
  );
}

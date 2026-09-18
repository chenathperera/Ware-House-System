"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import { useCreateSupplier } from "./useSuppliers.js";
const defaults = {
  displayName: "",
  legalName: "",
  phone: "",
  email: "",
  addressLine1: "",
  city: "",
  paymentTermsType: "cash",
  creditDays: 30,
};
export function toQuickSupplierPayload(form) {
  return {
    displayName: form.displayName,
    legalName: form.legalName || form.displayName,
    primaryContact: {
      name: form.displayName,
      phone: form.phone || undefined,
      email: form.email || undefined,
    },
    primaryAddress: form.addressLine1
      ? { line1: form.addressLine1, city: form.city, country: "Sri Lanka" }
      : undefined,
    paymentTerms: {
      type: form.paymentTermsType,
      creditDays: form.paymentTermsType === "credit" ? +form.creditDays : 0,
    },
    status: "active",
  };
}
export default function QuickCreateSupplierModal({
  isOpen,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(defaults);
  const createMutation = useCreateSupplier();
  const change = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  async function submit() {
    if (!form.displayName) return toast.error("Supplier name required");
    if (!form.phone && !form.email)
      return toast.error("Phone or email required");
    try {
      const result = await createMutation.mutateAsync(
        toQuickSupplierPayload(form),
      );
      setForm(defaults);
      toast.success("Supplier created — complete details later");
      onCreated?.(result.data);
      onClose();
    } catch {}
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Create Supplier"
      size="md"
    >
      <div className="space-y-4 p-6">
        <p className="rounded bg-blue-50 p-2 text-xs text-blue-700">
          Capture basics now. Add bank details, full address, tax info from the
          Suppliers page later.
        </p>
        <Input
          label="Display Name"
          required
          placeholder="ABC Suppliers Pvt Ltd"
          value={form.displayName}
          onChange={change("displayName")}
        />
        <Input
          label="Legal Name (optional)"
          placeholder="Same as display"
          value={form.legalName}
          onChange={change("legalName")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" value={form.phone} onChange={change("phone")} />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={change("email")}
          />
        </div>
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
        <div className="grid grid-cols-2 gap-3">
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
            <Input
              label="Credit Days"
              type="number"
              min="0"
              value={form.creditDays}
              onChange={change("creditDays")}
            />
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={submit}
          loading={createMutation.isPending}
        >
          Create Supplier
        </Button>
      </div>
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { supplierFormSchema } from "./supplierSchemas.js";
import {
  hydrateSupplierForm,
  supplierFormDefaults,
  toSupplierPayload,
} from "./supplierFormState.js";
import { useCreateSupplier, useUpdateSupplier } from "./useSuppliers.js";

const tabs = [
  { id: "basic", label: "Basic Info" },
  { id: "address", label: "Addresses" },
  { id: "commercial", label: "Commercial" },
  { id: "banking", label: "Banking" },
];
const categoryOptions = [
  ["raw_material", "Raw Material"],
  ["packaging", "Packaging"],
  ["finished_goods", "Finished Goods"],
  ["services", "Services"],
  ["equipment", "Equipment"],
  ["multiple", "Multiple"],
].map(([value, label]) => ({ value, label }));
const statusOptions = [
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["on_hold", "On Hold"],
  ["blacklisted", "Blacklisted"],
].map(([value, label]) => ({ value, label }));

export default function SupplierFormModal({
  isOpen,
  onClose,
  supplier = null,
}) {
  const [activeTab, setActiveTab] = useState("basic");
  const isEdit = !!supplier;
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplierFormDefaults(),
  });
  const type = watch("type");
  const index = tabs.findIndex((tab) => tab.id === activeTab);
  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen) reset(hydrateSupplierForm(supplier));
    setActiveTab("basic");
  }, [isOpen, supplier, reset]);
  async function submit(data) {
    try {
      const payload = toSupplierPayload(data);
      if (isEdit)
        await updateMutation.mutateAsync({ id: supplier._id, data: payload });
      else await createMutation.mutateAsync(payload);
      onClose();
    } catch {}
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit ? `Edit Supplier — ${supplier?.supplierCode}` : "New Supplier"
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="border-b border-gray-200">
          <div className="flex gap-1 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${activeTab === tab.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {activeTab === "basic" && (
            <Basic type={type} register={register} errors={errors} />
          )}
          {activeTab === "address" && <Addresses register={register} />}
          {activeTab === "commercial" && <Commercial register={register} />}
          {activeTab === "banking" && <Banking register={register} />}
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div>
            {activeTab !== "basic" && (
              <Button
                variant="outline"
                type="button"
                onClick={() => setActiveTab(tabs[index - 1].id)}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {activeTab !== "banking" ? (
              <Button
                variant="primary"
                type="button"
                onClick={() => setActiveTab(tabs[index + 1].id)}
              >
                Next
              </Button>
            ) : (
              <Button variant="primary" type="submit" loading={isLoading}>
                {isEdit ? "Update Supplier" : "Create Supplier"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Basic({ type, register, errors }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Type"
          required
          options={[
            { value: "company", label: "Company" },
            { value: "individual", label: "Individual" },
          ]}
          {...register("type")}
        />
        <Select
          label="Category"
          required
          options={categoryOptions}
          {...register("category")}
        />
      </div>
      {type === "company" ? (
        <Input
          label="Company Name"
          error={errors.companyName?.message}
          {...register("companyName")}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" {...register("firstName")} />
          <Input label="Last Name" {...register("lastName")} />
        </div>
      )}
      <Input
        label="Display Name"
        required
        placeholder="Short name for lists"
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tax Registration (VAT)"
          {...register("taxRegistrationNumber")}
        />
        <Input
          label="Business Registration"
          {...register("businessRegistrationNumber")}
        />
      </div>
      <Select
        label="Status"
        required
        options={statusOptions}
        {...register("status")}
      />
      <div className="border-t pt-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">
          Primary Contact
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" {...register("primaryContact.name")} />
          <Input
            label="Email"
            type="email"
            error={errors.primaryContact?.email?.message}
            {...register("primaryContact.email")}
          />
          <Input label="Phone" {...register("primaryContact.phone")} />
          <Input label="Mobile" {...register("primaryContact.mobile")} />
        </div>
      </div>
      <Textarea label="Notes" rows={3} {...register("notes")} />
    </div>
  );
}
function Addresses({ register }) {
  return (
    <div className="space-y-6">
      <Address
        heading="Billing Address"
        path="billingAddress"
        register={register}
      />
      <div className="border-t pt-4">
        <Address
          heading="Shipping Address (if different)"
          path="shippingAddress"
          register={register}
          simple
        />
      </div>
    </div>
  );
}
function Address({ heading, path, register, simple = false }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-gray-700">{heading}</h4>
      <div className="space-y-3">
        <Input label="Address Line 1" {...register(`${path}.line1`)} />
        {!simple && (
          <Input label="Address Line 2" {...register(`${path}.line2`)} />
        )}
        <div className="grid grid-cols-3 gap-4">
          <Input label="City" {...register(`${path}.city`)} />
          <Input label="Postal Code" {...register(`${path}.postalCode`)} />
          <Input label="Country" {...register(`${path}.country`)} />
        </div>
      </div>
    </div>
  );
}
function Commercial({ register }) {
  return (
    <div className="space-y-4">
      <Select
        label="Payment Terms"
        required
        options={[
          { value: "advance", label: "Advance (pay before goods)" },
          { value: "cod", label: "COD (pay on delivery)" },
          { value: "credit", label: "Credit" },
          { value: "consignment", label: "Consignment" },
        ]}
        {...register("paymentTermsType")}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Credit Days" type="number" {...register("creditDays")} />
        <Input
          label="Credit Limit (LKR)"
          type="number"
          step="0.01"
          {...register("creditLimit")}
        />
      </div>
      <Input
        label="Average Lead Time (Days)"
        type="number"
        {...register("averageLeadTimeDays")}
      />
    </div>
  );
}
function Banking({ register }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Supplier&apos;s bank details (for payments to them). Optional.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Bank Name" {...register("bankName")} />
        <Input label="Branch Name" {...register("branchName")} />
        <Input label="Account Name" {...register("accountName")} />
        <Input label="Account Number" {...register("accountNumber")} />
        <Input label="SWIFT Code" {...register("swiftCode")} />
      </div>
    </div>
  );
}

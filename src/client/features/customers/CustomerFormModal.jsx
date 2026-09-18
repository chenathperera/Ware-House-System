"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { usersApi } from "../users/usersApi.js";
import { customerFormSchema } from "./customerSchemas.js";
import {
  customerFormDefaults,
  emptyAddress,
  emptyContact,
  hydrateCustomerForm,
  toCustomerPayload,
} from "./customerFormState.js";
import {
  useCreateCustomer,
  useCustomerGroups,
  useUpdateCustomer,
} from "./useCustomers.js";

const tabs = [
  { id: "basic", label: "Basic Info" },
  { id: "addresses", label: "Addresses" },
  { id: "commercial", label: "Commercial" },
  { id: "contacts", label: "Contacts" },
];

const businessTypeOptions = [
  { value: "wholesaler", label: "Wholesaler" },
  { value: "retailer", label: "Retailer" },
  { value: "distributor", label: "Distributor" },
  { value: "reseller", label: "Reseller" },
  { value: "end_user", label: "End User" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "prospect", label: "Prospect" },
  { value: "on_hold", label: "On Hold" },
  { value: "blacklisted", label: "Blacklisted" },
];

export default function CustomerFormModal({
  isOpen,
  onClose,
  customer = null,
}) {
  const [activeTab, setActiveTab] = useState("basic");
  const isEdit = !!customer;
  const { data: groupsData } = useCustomerGroups();
  const { data: usersData } = useQuery({
    queryKey: ["users", "sales_reps"],
    queryFn: () => usersApi.list({ role: "sales_rep", isActive: true }),
    staleTime: 5 * 60 * 1000,
  });
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customerFormDefaults(),
  });
  const customerType = watch("customerType");
  const paymentType = watch("paymentTermsType");
  const shipping = useFieldArray({ control, name: "shippingAddresses" });
  const contacts = useFieldArray({ control, name: "contacts" });

  useEffect(() => {
    if (isOpen) reset(hydrateCustomerForm(customer));
    setActiveTab("basic");
  }, [customer, isOpen, reset]);

  async function onSubmit(data) {
    const payload = toCustomerPayload(data);
    try {
      if (isEdit)
        await updateMutation.mutateAsync({ id: customer._id, data: payload });
      else await createMutation.mutateAsync(payload);
      onClose();
    } catch {}
  }

  const groupOptions = (groupsData?.data || []).map((group) => ({
    value: group._id,
    label: `${group.name} (${group.code})`,
  }));
  const repOptions = (usersData?.data || []).map((user) => ({
    value: user._id,
    label: `${user.firstName} ${user.lastName}`,
  }));
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const tabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit ? `Edit Customer — ${customer?.customerCode}` : "New Customer"
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
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
            <BasicTab
              customerType={customerType}
              register={register}
              errors={errors}
              groupOptions={groupOptions}
              repOptions={repOptions}
            />
          )}
          {activeTab === "addresses" && (
            <AddressesTab register={register} shipping={shipping} />
          )}
          {activeTab === "commercial" && (
            <CommercialTab
              paymentType={paymentType}
              register={register}
              errors={errors}
              customer={customer}
              isEdit={isEdit}
            />
          )}
          {activeTab === "contacts" && (
            <ContactsTab
              register={register}
              errors={errors}
              contacts={contacts}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex gap-2">
            {activeTab !== "basic" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab(tabs[tabIndex - 1].id)}
              >
                Previous
              </Button>
            )}
            {activeTab !== "contacts" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab(tabs[tabIndex + 1].id)}
              >
                Next
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isLoading}>
              {isEdit ? "Update Customer" : "Create Customer"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function BasicTab({
  customerType,
  register,
  errors,
  groupOptions,
  repOptions,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Customer Type"
          required
          options={[
            { value: "company", label: "Company" },
            { value: "individual", label: "Individual" },
          ]}
          error={errors.customerType?.message}
          {...register("customerType")}
        />
        <Select
          label="Business Type"
          required
          options={businessTypeOptions}
          error={errors.businessType?.message}
          {...register("businessType")}
        />
      </div>
      {customerType === "company" ? (
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
        placeholder="Short name to show in lists"
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tax Registration Number (VAT)"
          error={errors.taxRegistrationNumber?.message}
          {...register("taxRegistrationNumber")}
        />
        <Input
          label="Business Registration Number"
          {...register("businessRegistrationNumber")}
        />
      </div>
      <Input label="Industry" {...register("industry")} />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Customer Group"
          placeholder="-- No group --"
          options={groupOptions}
          {...register("customerGroupId")}
        />
        <Select
          label="Assigned Sales Rep"
          placeholder="-- Unassigned --"
          options={repOptions}
          {...register("assignedSalesRep")}
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

function AddressesTab({ register, shipping }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-700">
          Billing Address
        </h4>
        <div className="space-y-3">
          <Input label="Address Line 1" {...register("billingAddress.line1")} />
          <Input label="Address Line 2" {...register("billingAddress.line2")} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" {...register("billingAddress.city")} />
            <Input
              label="State/Province"
              {...register("billingAddress.state")}
            />
            <Input
              label="Postal Code"
              {...register("billingAddress.postalCode")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Country" {...register("billingAddress.country")} />
            <Input label="Phone" {...register("billingAddress.phone")} />
          </div>
        </div>
      </div>
      <div className="border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">
            Shipping Addresses
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shipping.append(emptyAddress)}
          >
            <Plus size={14} className="mr-1" />
            Add Address
          </Button>
        </div>
        {shipping.fields.map((field, index) => (
          <ShippingAddress
            key={field.id}
            index={index}
            register={register}
            canRemove={shipping.fields.length > 1}
            onRemove={() => shipping.remove(index)}
          />
        ))}
      </div>
    </div>
  );
}

function ShippingAddress({ index, register, canRemove, onRemove }) {
  return (
    <div className="mb-3 rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Shipping Address {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Label"
            placeholder="Main Shop, Warehouse..."
            {...register(`shippingAddresses.${index}.label`)}
          />
          <div className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              id={`ship-default-${index}`}
              {...register(`shippingAddresses.${index}.isDefault`)}
            />
            <label
              htmlFor={`ship-default-${index}`}
              className="text-sm text-gray-700"
            >
              Default shipping address
            </label>
          </div>
        </div>
        <Input
          label="Address Line 1"
          {...register(`shippingAddresses.${index}.line1`)}
        />
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="City"
            {...register(`shippingAddresses.${index}.city`)}
          />
          <Input
            label="Postal Code"
            {...register(`shippingAddresses.${index}.postalCode`)}
          />
          <Input
            label="Phone"
            {...register(`shippingAddresses.${index}.phone`)}
          />
        </div>
        <Input
          label="Delivery Instructions"
          {...register(`shippingAddresses.${index}.deliveryInstructions`)}
        />
      </div>
    </div>
  );
}

function CommercialTab({ paymentType, register, errors, customer, isEdit }) {
  return (
    <div className="space-y-4">
      <Select
        label="Payment Terms"
        required
        options={[
          { value: "advance", label: "Advance (pay before delivery)" },
          { value: "cod", label: "COD (pay on delivery)" },
          { value: "credit", label: "Credit (pay later)" },
        ]}
        {...register("paymentTermsType")}
      />
      {paymentType === "credit" && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Credit Days"
            type="number"
            {...register("creditDays")}
          />
          <Input
            label="Credit Limit (LKR)"
            type="number"
            step="0.01"
            {...register("creditLimit")}
          />
        </div>
      )}
      <Input
        label="Default Discount Percent (%)"
        type="number"
        step="0.01"
        error={errors.defaultDiscountPercent?.message}
        {...register("defaultDiscountPercent")}
      />
      {isEdit && customer?.creditStatus && (
        <CreditStatus creditStatus={customer.creditStatus} />
      )}
    </div>
  );
}

function CreditStatus({ creditStatus }) {
  return (
    <div className="mt-4 rounded-lg bg-gray-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-700">
        Current Credit Status
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Outstanding</p>
          <p className="font-medium">
            LKR {creditStatus.currentBalance?.toLocaleString() || 0}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Available</p>
          <p className="font-medium text-green-600">
            LKR {creditStatus.availableCredit?.toLocaleString() || 0}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Overdue</p>
          <p
            className={`font-medium ${creditStatus.isOverdue ? "text-red-600" : ""}`}
          >
            LKR {creditStatus.overdueAmount?.toLocaleString() || 0}
          </p>
        </div>
      </div>
    </div>
  );
}

function ContactsTab({ register, errors, contacts }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          Additional Contacts
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => contacts.append(emptyContact)}
        >
          <Plus size={14} className="mr-1" />
          Add Contact
        </Button>
      </div>
      {contacts.fields.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No additional contacts. Click &quot;Add Contact&quot; to include people like
          accounts or logistics staff.
        </p>
      ) : (
        contacts.fields.map((field, index) => (
          <AdditionalContact
            key={field.id}
            index={index}
            register={register}
            errors={errors}
            onRemove={() => contacts.remove(index)}
          />
        ))
      )}
    </div>
  );
}

function AdditionalContact({ index, register, errors, onRemove }) {
  return (
    <div className="mb-3 rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Contact {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-red-600 hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Name" {...register(`contacts.${index}.name`)} />
        <Input
          label="Designation"
          {...register(`contacts.${index}.designation`)}
        />
        <Input
          label="Email"
          type="email"
          error={errors.contacts?.[index]?.email?.message}
          {...register(`contacts.${index}.email`)}
        />
        <Input label="Phone" {...register(`contacts.${index}.phone`)} />
        <Select
          label="Role"
          options={[
            { value: "owner", label: "Owner" },
            { value: "purchasing", label: "Purchasing" },
            { value: "accounts", label: "Accounts" },
            { value: "logistics", label: "Logistics" },
            { value: "other", label: "Other" },
          ]}
          {...register(`contacts.${index}.role`)}
        />
        <div className="flex items-end pb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`contact-primary-${index}`}
              {...register(`contacts.${index}.isPrimary`)}
            />
            <label
              htmlFor={`contact-primary-${index}`}
              className="text-sm text-gray-700"
            >
              Primary contact
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import { warehouseFormSchema } from "./warehouseSchemas.js";
import { useCreateWarehouse, useUpdateWarehouse } from "./useWarehouses.js";
import { usersApi } from "../users/usersApi.js";

const defaultValues = {
  type: "branch",
  address: { country: "Sri Lanka" },
  capabilities: { canShipDirectly: true, canReceiveGoods: true },
  zones: [{ code: "STG", name: "Storage", type: "storage", isActive: true }],
  pickingStrategy: "FIFO",
  allowNegativeStock: false,
  isActive: true,
  isDefault: false,
  assignedRep: "",
};

export default function WarehouseFormModal({ isOpen, onClose, warehouse = null }) {
  const isEdit = !!warehouse;
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();

  const { data: usersData } = useQuery({
    queryKey: ["users", "managers"],
    queryFn: () => usersApi.list({ isActive: true, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues,
  });

  const { fields: zoneFields, append, remove } = useFieldArray({ control, name: "zones" });

  useEffect(() => {
    if (isOpen && warehouse) {
      reset({
        warehouseCode: warehouse.warehouseCode,
        name: warehouse.name,
        type: warehouse.type,
        address: warehouse.address || { country: "Sri Lanka" },
        phone: warehouse.phone || "",
        email: warehouse.email || "",
        warehouseManager: warehouse.warehouseManager?._id || warehouse.warehouseManager || "",
        assignedRep: warehouse.assignedRep?._id || warehouse.assignedRep || "",
        capabilities: warehouse.capabilities || {},
        zones: warehouse.zones?.length ? warehouse.zones : defaultValues.zones,
        pickingStrategy: warehouse.settings?.pickingStrategy || "FIFO",
        allowNegativeStock: warehouse.settings?.allowNegativeStock || false,
        isActive: warehouse.isActive,
        isDefault: warehouse.isDefault,
      });
    } else if (isOpen) {
      reset(defaultValues);
    }
  }, [isOpen, warehouse, reset]);

  const onSubmit = async (data) => {
    const payload = {
      warehouseCode: data.warehouseCode.toUpperCase(),
      name: data.name,
      type: data.type,
      address: data.address,
      phone: data.phone || undefined,
      email: data.email || undefined,
      warehouseManager: data.warehouseManager || undefined,
      assignedRep: data.assignedRep || undefined,
      capabilities: data.capabilities,
      zones: data.zones?.filter((z) => z.name),
      settings: {
        pickingStrategy: data.pickingStrategy,
        allowNegativeStock: data.allowNegativeStock,
      },
      isActive: data.isActive,
      isDefault: data.isDefault,
    };

    try {
      if (isEdit) await updateMutation.mutateAsync({ id: warehouse._id, data: payload });
      else await createMutation.mutateAsync(payload);
      onClose();
    } catch {
      /* toast handled by mutation */
    }
  };

  const managerOptions = (usersData?.data || [])
    .filter((u) => ["admin", "manager", "warehouse_staff"].includes(u.role))
    .map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName} (${u.role})` }));

  const repOptions = (usersData?.data || [])
    .filter((u) => ["sales_rep", "manager"].includes(u.role))
    .map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName} (${u.role})` }));

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Warehouse — ${warehouse?.warehouseCode}` : "New Warehouse"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Code"
              required
              error={errors.warehouseCode?.message}
              {...register("warehouseCode")}
            />
            <Input label="Name" required error={errors.name?.message} {...register("name")} />
            <Select
              label="Type"
              required
              options={[
                { value: "main", label: "Main Warehouse" },
                { value: "branch", label: "Branch" },
                { value: "transit", label: "In Transit" },
                { value: "virtual", label: "Virtual" },
                { value: "quarantine", label: "Quarantine" },
                { value: "scrap", label: "Scrap/Damage" },
                { value: "van", label: "Van (Mobile)" },
              ]}
              {...register("type")}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Address</h4>
            <div className="space-y-3">
              <Input label="Address Line 1" {...register("address.line1")} />
              <div className="grid grid-cols-3 gap-4">
                <Input label="City" {...register("address.city")} />
                <Input label="Postal Code" {...register("address.postalCode")} />
                <Input label="Country" {...register("address.country")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" {...register("phone")} />
                <Input
                  label="Email"
                  type="email"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Warehouse Manager"
              placeholder="-- Unassigned --"
              options={managerOptions}
              {...register("warehouseManager")}
            />
            <Select
              label="Assigned Sales Rep"
              placeholder="-- None --"
              options={repOptions}
              {...register("assignedRep")}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Capabilities</h4>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("capabilities.canShipDirectly")} />
                Can ship directly to customers
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("capabilities.canReceiveGoods")} />
                Can receive goods from suppliers
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("capabilities.temperatureControlled")} />
                Temperature controlled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("capabilities.hasRefrigeration")} />
                Has refrigeration
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">Zones</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ code: "", name: "", type: "storage", isActive: true })}
              >
                <Plus size={14} className="mr-1" /> Add Zone
              </Button>
            </div>
            <div className="space-y-2">
              {zoneFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 p-2"
                >
                  <div className="w-24">
                    <Input placeholder="Code" {...register(`zones.${idx}.code`)} />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Zone name"
                      error={errors.zones?.[idx]?.name?.message}
                      {...register(`zones.${idx}.name`)}
                    />
                  </div>
                  <div className="w-36">
                    <Select
                      options={[
                        { value: "receiving", label: "Receiving" },
                        { value: "storage", label: "Storage" },
                        { value: "picking", label: "Picking" },
                        { value: "packing", label: "Packing" },
                        { value: "dispatch", label: "Dispatch" },
                        { value: "returns", label: "Returns" },
                        { value: "quarantine", label: "Quarantine" },
                      ]}
                      {...register(`zones.${idx}.type`)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="mt-0.5 rounded p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Picking Strategy"
                options={[
                  { value: "FIFO", label: "FIFO (First In, First Out)" },
                  { value: "LIFO", label: "LIFO (Last In, First Out)" },
                  { value: "FEFO", label: "FEFO (First Expiry, First Out)" },
                ]}
                {...register("pickingStrategy")}
              />
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("allowNegativeStock")} />
                  Allow negative stock
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("isActive")} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("isDefault")} />
              Default warehouse
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            {isEdit ? "Update" : "Create Warehouse"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

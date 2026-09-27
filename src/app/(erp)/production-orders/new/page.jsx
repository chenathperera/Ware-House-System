"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeft, CheckCircle, Save } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import Badge from "../../../../components/ui/Badge.jsx";
import { bomsApi } from "../../../../client/features/boms/bomsApi.js";
import {
  useBom,
  useCheckAvailability,
} from "../../../../client/features/boms/useBoms.js";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";
import { useCreateProductionOrder } from "../../../../client/features/production/useProduction.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);
const quantity = (value) =>
  new Intl.NumberFormat("en-LK", { maximumFractionDigits: 4 }).format(
    value || 0,
  );

export default function NewProductionOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bomId, setBomId] = useState(searchParams.get("bomId") || "");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [outputWarehouseId, setOutputWarehouseId] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const { data: bomsData } = useQuery({
    queryKey: ["boms", "active"],
    queryFn: () => bomsApi.list({ status: "active", limit: 200 }),
  });
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const { data: bomDetail } = useBom(bomId);
  const { data: availabilityData } = useCheckAvailability(
    bomId,
    plannedQuantity,
    sourceWarehouseId,
  );
  const create = useCreateProductionOrder();
  const boms = bomsData?.data || [];
  const warehouses = useMemo(
    () => warehousesData?.data || [],
    [warehousesData?.data],
  );
  const bom = bomDetail?.data;
  const availability = availabilityData?.data;

  useEffect(() => {
    if (!sourceWarehouseId && warehouses.length > 0) {
      const defaultWarehouse = warehouses.find((item) => item.isDefault);
      if (defaultWarehouse) {
        setSourceWarehouseId(defaultWarehouse._id);
        setOutputWarehouseId(defaultWarehouse._id);
      }
    }
  }, [warehouses, sourceWarehouseId]);

  const bomOptions = boms.map((item) => ({
    value: item._id,
    label: `${item.name} v${item.version} — makes ${item.finishedProductName}`,
  }));
  const warehouseOptions = warehouses.map((item) => ({
    value: item._id,
    label: `${item.name} (${item.warehouseCode})`,
  }));
  const estimatedCost = useMemo(
    () =>
      !bom || !plannedQuantity
        ? 0
        : (bom.totalCost || 0) * (+plannedQuantity / bom.outputQuantity),
    [bom, plannedQuantity],
  );
  const submit = async () => {
    if (!bomId) return toast.error("Select a BOM");
    if (!plannedQuantity || +plannedQuantity <= 0)
      return toast.error("Enter quantity");
    if (!sourceWarehouseId || !outputWarehouseId)
      return toast.error("Select warehouses");
    try {
      const result = await create.mutateAsync({
        bomId,
        plannedQuantity: +plannedQuantity,
        sourceWarehouseId,
        outputWarehouseId,
        plannedStartDate: plannedStartDate || undefined,
        plannedEndDate: plannedEndDate || undefined,
        priority,
        notes: notes || undefined,
      });
      router.push(`/production-orders/${result.data._id}`);
    } catch {}
  };

  return (
    <div>
      <PageHeader
        title="New Production Order"
        description="Plan the manufacturing of finished goods"
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/production-orders")}
          >
            <ArrowLeft size={16} className="mr-1.5" /> Back
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Recipe &amp; Quantity
            </h3>
            <div className="space-y-4">
              <Select
                label="BOM (Recipe)"
                required
                placeholder="Select recipe..."
                options={bomOptions}
                value={bomId}
                onChange={(event) => setBomId(event.target.value)}
              />
              {bom && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <p>
                    <span className="text-gray-500">Makes:</span>{" "}
                    {bom.finishedProductName}
                  </p>
                  <p>
                    <span className="text-gray-500">Batch size:</span>{" "}
                    {bom.outputQuantity} {bom.outputUnitOfMeasure}
                  </p>
                  <p>
                    <span className="text-gray-500">Components:</span>{" "}
                    {bom.components?.length}
                  </p>
                  <p>
                    <span className="text-gray-500">Cost per unit:</span>{" "}
                    {money(bom.costPerUnit)}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantity to Produce"
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={plannedQuantity}
                  onChange={(event) => setPlannedQuantity(event.target.value)}
                  placeholder={bom ? `Min: ${bom.outputQuantity}` : ""}
                />
                <Select
                  label="Priority"
                  options={[
                    { value: "low", label: "Low" },
                    { value: "normal", label: "Normal" },
                    { value: "high", label: "High" },
                    { value: "urgent", label: "Urgent" },
                  ]}
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Planned Start Date"
                  type="date"
                  value={plannedStartDate}
                  onChange={(event) => setPlannedStartDate(event.target.value)}
                />
                <Input
                  label="Planned End Date"
                  type="date"
                  value={plannedEndDate}
                  onChange={(event) => setPlannedEndDate(event.target.value)}
                />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Warehouses
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Source Warehouse (raw materials)"
                required
                options={warehouseOptions}
                value={sourceWarehouseId}
                onChange={(event) => setSourceWarehouseId(event.target.value)}
              />
              <Select
                label="Output Warehouse (finished goods)"
                required
                options={warehouseOptions}
                value={outputWarehouseId}
                onChange={(event) => setOutputWarehouseId(event.target.value)}
              />
            </div>
          </Card>
          {availability && (
            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2">
                {availability.canProduce ? (
                  <>
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="font-semibold text-green-700">
                      Materials Available
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} className="text-amber-600" />
                    <span className="font-semibold text-amber-700">
                      Material Shortage
                    </span>
                  </>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-600">
                      Material
                    </th>
                    <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600">
                      Required
                    </th>
                    <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600">
                      Available
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {availability.components.map((component) => (
                    <tr key={component.productId}>
                      <td className="px-2 py-2">{component.productName}</td>
                      <td className="px-2 py-2 text-right">
                        {quantity(component.required)} {component.unitOfMeasure}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {quantity(component.available)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {component.isSufficient ? (
                          <Badge variant="success">OK</Badge>
                        ) : (
                          <Badge variant="danger">
                            Short {quantity(component.shortage)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!availability.canProduce && (
                <p className="mt-3 text-xs text-amber-700">
                  You can still create and plan the order. Starting production
                  will fail until materials are in stock.
                </p>
              )}
            </Card>
          )}
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Notes</h3>
            <Textarea
              label="Notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Card>
        </div>
        <div>
          <Card className="sticky top-6 p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Will produce</span>
                <span className="font-medium">
                  {plannedQuantity || "—"} {bom?.outputUnitOfMeasure}
                </span>
              </div>
              {bom && plannedQuantity && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Batches</span>
                  <span>
                    {(+plannedQuantity / bom.outputQuantity).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Estimated Cost</span>
                <span className="font-bold text-primary-600">
                  {money(estimatedCost)}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              fullWidth
              className="mt-6"
              onClick={submit}
              loading={create.isPending}
              disabled={
                !bomId ||
                !plannedQuantity ||
                !sourceWarehouseId ||
                !outputWarehouseId
              }
            >
              <Save size={16} className="mr-1.5" /> Create Order
            </Button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Will be created as draft. Approve it before starting production.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

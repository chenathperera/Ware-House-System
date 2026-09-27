"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Factory,
  PauseCircle,
  Play,
} from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Badge from "../../../../components/ui/Badge.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import CompleteProductionModal from "../../../../client/features/production/CompleteProductionModal.jsx";
import {
  useProductionAction,
  useProductionOrder,
} from "../../../../client/features/production/useProduction.js";
import { useAuthStore } from "../../../../client/store/authStore.js";

const statusVariant = {
  draft: "default",
  planned: "info",
  materials_reserved: "info",
  in_progress: "warning",
  on_hold: "warning",
  completed: "success",
  partially_completed: "warning",
  cancelled: "danger",
  closed: "default",
};
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
const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function ProductionOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const actions = useProductionAction();
  const { data, isLoading } = useProductionOrder(id);
  const [actionDialog, setActionDialog] = useState(null);
  const [reason, setReason] = useState("");
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const po = data?.data;
  if (isLoading || !po)
    return <div className="py-16 text-center text-gray-500">Loading...</div>;
  const canProduce = ["admin", "manager", "production_staff"].includes(
    user?.role,
  );
  const canCancel = ["admin", "manager"].includes(user?.role);
  const buttons = [];
  if (po.status === "draft" && canProduce)
    buttons.push({
      label: "Approve",
      icon: CheckCircle,
      variant: "primary",
      fn: "approve",
    });
  if (
    ["planned", "materials_reserved", "on_hold"].includes(po.status) &&
    canProduce
  )
    buttons.push({
      label: "Start Production",
      icon: Play,
      variant: "primary",
      fn: "start",
    });
  if (po.status === "in_progress" && canProduce) {
    buttons.push({
      label: "Complete Production",
      icon: Factory,
      variant: "primary",
      onClick: () => setIsCompleteOpen(true),
    });
    buttons.push({
      label: "Put on Hold",
      icon: PauseCircle,
      variant: "outline",
      fn: "hold",
      needsReason: true,
    });
  }
  if (
    [
      "draft",
      "planned",
      "materials_reserved",
      "in_progress",
      "on_hold",
    ].includes(po.status) &&
    canCancel
  )
    buttons.push({
      label: "Cancel",
      icon: Ban,
      variant: "danger",
      fn: "cancel",
      needsReason: true,
    });
  const runAction = async () => {
    if (actionDialog.fn === "approve")
      await actions.approve.mutateAsync(po._id);
    if (actionDialog.fn === "start") await actions.start.mutateAsync(po._id);
    if (actionDialog.fn === "hold")
      await actions.hold.mutateAsync({ id: po._id, reason });
    if (actionDialog.fn === "cancel")
      await actions.cancel.mutateAsync({ id: po._id, reason });
    setActionDialog(null);
    setReason("");
  };
  const loading =
    actions.approve.isPending ||
    actions.start.isPending ||
    actions.hold.isPending ||
    actions.cancel.isPending;
  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {po.productionNumber}
            <Badge variant={statusVariant[po.status]}>
              {po.status.replace("_", " ")}
            </Badge>
            <Badge>{po.priority}</Badge>
          </span>
        }
        description={`Making ${po.plannedQuantity} ${po.output?.[0]?.unitOfMeasure || "units"} of ${po.finishedProductName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/production-orders")}
            >
              <ArrowLeft size={16} className="mr-1.5" /> Back
            </Button>
            {buttons.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.label}
                  variant={item.variant}
                  onClick={item.onClick || (() => setActionDialog(item))}
                >
                  <Icon size={16} className="mr-1.5" /> {item.label}
                </Button>
              );
            })}
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Raw Materials to Consume
              </h3>
              <span className="text-xs text-gray-500">
                Source: {po.sourceWarehouseId?.name}
              </span>
            </div>
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Material
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Planned
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Actual
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Variance
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {po.consumption.map((item) => {
                  const variance =
                    (item.actualQuantity || 0) - item.plannedQuantity;
                  return (
                    <tr key={item._id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">
                          {item.productName}
                        </p>
                        <p className="font-mono text-xs text-gray-500">
                          {item.productCode}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {quantity(item.plannedQuantity)} {item.unitOfMeasure}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {item.actualQuantity > 0
                          ? quantity(item.actualQuantity)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {item.actualQuantity > 0 && (
                          <span
                            className={
                              variance > 0
                                ? "text-red-600"
                                : variance < 0
                                  ? "text-green-600"
                                  : ""
                            }
                          >
                            {variance > 0 ? "+" : ""}
                            {quantity(variance)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {money(
                          item.actualCost ||
                            item.standardCost * item.plannedQuantity,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-700">Output</h3>
              <span className="text-xs text-gray-500">
                Destination: {po.outputWarehouseId?.name}
              </span>
            </div>
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Product
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Planned
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Produced
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Damaged
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Batch
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                    Cost/Unit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {po.output.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="font-mono text-xs text-gray-500">
                        {item.productCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {quantity(item.plannedQuantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                      {item.actualQuantity > 0
                        ? quantity(item.actualQuantity)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.damagedQuantity > 0 && (
                        <span className="text-red-600">
                          {quantity(item.damagedQuantity)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {item.batchNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {money(item.costPerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {po.notes && (
            <Card className="p-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Notes
              </h3>
              <p className="whitespace-pre-wrap text-sm">{po.notes}</p>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Cost Tracking
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Planned Material</span>
                <span>{money(po.plannedMaterialCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actual Material</span>
                <span>{money(po.actualMaterialCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Planned Labor</span>
                <span>{money(po.plannedLaborCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actual Labor</span>
                <span>{money(po.actualLaborCost)}</span>
              </div>
              {po.overheadCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Overhead</span>
                  <span>{money(po.overheadCost)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Planned Total</span>
                <span>{money(po.totalPlannedCost)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Actual Total</span>
                <span>{money(po.totalActualCost)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Cost per Unit</span>
                <span className="font-bold text-primary-600">
                  {money(po.costPerUnit)}
                </span>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Timeline
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{date(po.createdAt)}</span>
              </div>
              {po.plannedStartDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Planned Start</span>
                  <span>{date(po.plannedStartDate)}</span>
                </div>
              )}
              {po.plannedEndDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Planned End</span>
                  <span>{date(po.plannedEndDate)}</span>
                </div>
              )}
              {po.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved</span>
                  <span>{date(po.approvedAt)}</span>
                </div>
              )}
              {po.actualStartDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Actual Start</span>
                  <span>{date(po.actualStartDate)}</span>
                </div>
              )}
              {po.actualEndDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Actual End</span>
                  <span>{date(po.actualEndDate)}</span>
                </div>
              )}
            </div>
          </Card>
          {po.cancelledAt && (
            <Card className="border-l-4 border-l-red-500 bg-red-50 p-6">
              <h3 className="mb-1 text-sm font-semibold text-red-800">
                Cancelled
              </h3>
              <p className="text-sm text-red-700">{po.cancellationReason}</p>
              <p className="mt-1 text-xs text-red-600">
                By {po.cancelledBy?.firstName} on {date(po.cancelledAt)}
              </p>
            </Card>
          )}
        </div>
      </div>
      <CompleteProductionModal
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        productionOrder={po}
      />
      <ConfirmDialog
        isOpen={!!actionDialog}
        onClose={() => {
          setActionDialog(null);
          setReason("");
        }}
        onConfirm={runAction}
        title={actionDialog?.label}
        message={
          actionDialog?.needsReason ? (
            <div>
              <p className="mb-3">Please provide a reason:</p>
              <textarea
                rows={3}
                className="w-full rounded border px-3 py-2 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          ) : (
            `${actionDialog?.label} this production order?`
          )
        }
        confirmText={actionDialog?.label}
        variant={actionDialog?.variant === "danger" ? "danger" : "primary"}
        loading={loading}
      />
    </div>
  );
}

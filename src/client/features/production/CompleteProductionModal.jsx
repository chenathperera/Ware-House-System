"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Factory } from "lucide-react";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import Select from "../../../components/ui/Select.jsx";
import { useProductionAction } from "./useProduction.js";

export default function CompleteProductionModal({
  isOpen,
  onClose,
  productionOrder,
}) {
  const { complete } = useProductionAction();
  const [consumption, setConsumption] = useState([]);
  const [labor, setLabor] = useState([]);
  const [output, setOutput] = useState([]);
  const [overheadCost, setOverheadCost] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen || !productionOrder) return;
    setConsumption(
      productionOrder.consumption.map((item) => ({
        consumptionItemId: item._id,
        productName: item.productName,
        unitOfMeasure: item.unitOfMeasure,
        plannedQuantity: item.plannedQuantity,
        actualQuantity: item.plannedQuantity,
      })),
    );
    setLabor(
      (productionOrder.labor || []).map((item) => ({
        laborLogId: item._id,
        laborType: item.laborType,
        description: item.description,
        plannedHours: item.plannedHours,
        actualHours: item.plannedHours,
        hourlyRate: item.hourlyRate,
      })),
    );
    setOutput(
      productionOrder.output.map((item) => ({
        productName: item.productName,
        plannedQuantity: item.plannedQuantity,
        actualQuantity: item.plannedQuantity,
        damagedQuantity: 0,
        rejectedQuantity: 0,
        qcStatus: "passed",
        batchNumber: `B-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${productionOrder.productionNumber.split("-").pop()}`,
        manufactureDate: new Date().toISOString().slice(0, 10),
        expiryDate: "",
      })),
    );
    setOverheadCost(0);
    setNotes("");
  }, [isOpen, productionOrder]);

  const changeRow = (setter, index, field, value) =>
    setter((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  const submit = async () => {
    if (
      output.reduce((sum, item) => sum + (+item.actualQuantity || 0), 0) === 0
    )
      return toast.error("At least one output quantity must be > 0");
    try {
      await complete.mutateAsync({
        id: productionOrder._id,
        data: {
          actualConsumption: consumption.map((item) => ({
            consumptionItemId: item.consumptionItemId,
            actualQuantity: +item.actualQuantity || 0,
          })),
          actualLabor: labor.map((item) => ({
            laborLogId: item.laborLogId,
            actualHours: +item.actualHours || 0,
            hourlyRate: +item.hourlyRate || 0,
          })),
          output: output.map((item) => ({
            actualQuantity: +item.actualQuantity || 0,
            damagedQuantity: +item.damagedQuantity || 0,
            rejectedQuantity: +item.rejectedQuantity || 0,
            batchNumber: item.batchNumber,
            manufactureDate: item.manufactureDate,
            expiryDate: item.expiryDate || undefined,
            qcStatus: item.qcStatus,
          })),
          overheadCost: +overheadCost || 0,
          notes: notes || undefined,
        },
      });
      onClose();
    } catch {}
  };
  if (!productionOrder) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Complete Production — ${productionOrder.productionNumber}`}
      size="xl"
    >
      <div className="space-y-4 p-6">
        <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <Factory size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-900">
            Completing production consumes raw materials from{" "}
            <strong>{productionOrder.sourceWarehouseId?.name}</strong> and adds
            finished goods to{" "}
            <strong>{productionOrder.outputWarehouseId?.name}</strong>. This
            action is atomic and cannot be undone.
          </div>
        </div>
        <section>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Actual Materials Consumed
          </h4>
          {consumption.map((item, index) => (
            <div
              key={item.consumptionItemId}
              className="mb-2 grid grid-cols-4 items-center gap-2 rounded border p-2"
            >
              <div className="col-span-2">
                <p className="text-sm font-medium">{item.productName}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                Planned: {item.plannedQuantity} {item.unitOfMeasure}
              </div>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={item.actualQuantity}
                onChange={(event) =>
                  changeRow(
                    setConsumption,
                    index,
                    "actualQuantity",
                    event.target.value,
                  )
                }
              />
            </div>
          ))}
        </section>
        {labor.length > 0 && (
          <section>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">
              Actual Labor
            </h4>
            {labor.map((item, index) => (
              <div
                key={item.laborLogId}
                className="mb-2 grid grid-cols-4 items-center gap-2 rounded border p-2"
              >
                <div className="col-span-2">
                  <p className="text-sm font-medium capitalize">
                    {item.laborType}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Actual hours"
                  value={item.actualHours}
                  onChange={(event) =>
                    changeRow(
                      setLabor,
                      index,
                      "actualHours",
                      event.target.value,
                    )
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Rate/hr"
                  value={item.hourlyRate}
                  onChange={(event) =>
                    changeRow(setLabor, index, "hourlyRate", event.target.value)
                  }
                />
              </div>
            ))}
          </section>
        )}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">Output</h4>
          {output.map((item, index) => (
            <div key={index} className="mb-3 rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">{item.productName}</p>
              <div className="mb-2 grid grid-cols-3 gap-2">
                <Input
                  label="Good (produced)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.actualQuantity}
                  onChange={(event) =>
                    changeRow(
                      setOutput,
                      index,
                      "actualQuantity",
                      event.target.value,
                    )
                  }
                />
                <Input
                  label="Damaged"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.damagedQuantity}
                  onChange={(event) =>
                    changeRow(
                      setOutput,
                      index,
                      "damagedQuantity",
                      event.target.value,
                    )
                  }
                />
                <Input
                  label="Rejected"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.rejectedQuantity}
                  onChange={(event) =>
                    changeRow(
                      setOutput,
                      index,
                      "rejectedQuantity",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Batch Number"
                  value={item.batchNumber}
                  onChange={(event) =>
                    changeRow(
                      setOutput,
                      index,
                      "batchNumber",
                      event.target.value,
                    )
                  }
                />
                <Input
                  label="Manufacture Date"
                  type="date"
                  value={item.manufactureDate}
                  onChange={(event) =>
                    changeRow(
                      setOutput,
                      index,
                      "manufactureDate",
                      event.target.value,
                    )
                  }
                />
                <Input
                  label="Expiry Date"
                  type="date"
                  value={item.expiryDate}
                  onChange={(event) =>
                    changeRow(
                      setOutput,
                      index,
                      "expiryDate",
                      event.target.value,
                    )
                  }
                />
              </div>
              <Select
                label="QC Status"
                options={[
                  { value: "pending", label: "Pending QC" },
                  { value: "passed", label: "Passed" },
                  { value: "failed", label: "Failed" },
                  { value: "partial", label: "Partial" },
                ]}
                value={item.qcStatus}
                onChange={(event) =>
                  changeRow(setOutput, index, "qcStatus", event.target.value)
                }
              />
            </div>
          ))}
        </section>
        <Input
          label="Overhead Cost (LKR)"
          type="number"
          step="0.01"
          min="0"
          value={overheadCost}
          onChange={(event) => setOverheadCost(event.target.value)}
        />
        <Textarea
          label="Completion Notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} loading={complete.isPending}>
          <Factory size={16} className="mr-1.5" /> Complete &amp; Update Stock
        </Button>
      </div>
    </Modal>
  );
}

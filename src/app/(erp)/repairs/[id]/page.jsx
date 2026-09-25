"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Play } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Badge from "../../../../components/ui/Badge.jsx";
import Modal from "../../../../components/ui/Modal.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { useRepair, useStartRepair, useCompleteRepair } from "../../../../client/features/repairs/useRepairs.js";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";

const variants = { pending: "default", in_progress: "warning", awaiting_parts: "warning", completed_fixed: "success", completed_unfixable: "danger" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function RepairDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data } = useRepair(id);
  const start = useStartRepair();
  const complete = useCompleteRepair();
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState("fixed");
  const [disposition, setDisposition] = useState("return_to_stock");
  const [laborHours, setLaborHours] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [partsCost, setPartsCost] = useState(0);
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const repair = data?.data;

  if (!repair) return <div className="py-16 text-center text-gray-500">Loading...</div>;

  const submit = async () => {
    await complete.mutateAsync({
      id: repair._id,
      data: { outcome, disposition, actualLaborHours: +laborHours, actualLaborCost: +laborCost, actualPartsCost: +partsCost, returnedToWarehouseId: disposition === "return_to_stock" ? warehouseId : undefined, notes },
    });
    setOpen(false);
  };

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.push("/repairs")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>
      {repair.status === "pending" && <Button variant="primary" onClick={() => start.mutate({ id: repair._id, data: {} })} loading={start.isPending}><Play size={16} className="mr-1.5" /> Start Repair</Button>}
      {["in_progress", "awaiting_parts"].includes(repair.status) && <Button variant="primary" onClick={() => setOpen(true)}><CheckCircle size={16} className="mr-1.5" /> Complete</Button>}
    </div>
  );

  return (
    <div>
      <PageHeader title={<>Repair {repair.repairNumber} <Badge variant={variants[repair.status]}>{repair.status.replace(/_/g, " ")}</Badge></>} actions={actions} />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="p-6">
            <p className="mb-1 text-sm"><span className="text-gray-500">Product:</span> {repair.productName} <span className="font-mono text-xs">{repair.productCode}</span></p>
            <p className="mb-1 text-sm"><span className="text-gray-500">Quantity:</span> {repair.quantity}</p>
            <p className="mt-3 text-sm"><span className="text-gray-500">Issue:</span></p>
            <p className="text-sm">{repair.issueDescription}</p>
            {repair.diagnosis && <><p className="mt-3 text-sm"><span className="text-gray-500">Diagnosis:</span></p><p className="text-sm">{repair.diagnosis}</p></>}
            {repair.customerReturnId && <p className="mt-3 text-sm"><span className="text-gray-500">From Return:</span>{" "}<button onClick={() => router.push(`/returns/${repair.customerReturnId._id}`)} className="text-primary-600 underline">{repair.customerReturnId.rmaNumber}</button></p>}
          </Card>
        </div>
        <Card className="p-6">
          <h3 className="mb-3 text-sm font-semibold">Costs</h3>
          <p className="text-sm">Labor Hours: {repair.actualLaborHours || 0}</p>
          <p className="text-sm">Labor Cost: {money(repair.actualLaborCost)}</p>
          <p className="text-sm">Parts Cost: {money(repair.actualPartsCost)}</p>
          <p className="mt-2 border-t pt-2 text-sm font-bold">Total: {money(repair.totalActualCost)}</p>
        </Card>
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Complete Repair" size="md">
        <div className="space-y-4 p-6">
          <Select label="Outcome" required options={[{ value: "fixed", label: "Fixed" }, { value: "unfixable", label: "Unfixable" }]} value={outcome} onChange={(event) => setOutcome(event.target.value)} />
          {outcome === "fixed" && <>
            <Select label="Disposition" options={[{ value: "return_to_stock", label: "Return to stock" }, { value: "return_to_customer", label: "Return to customer" }]} value={disposition} onChange={(event) => setDisposition(event.target.value)} />
            {disposition === "return_to_stock" && <Select label="Return to warehouse" required options={(warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }))} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />}
          </>}
          <Input label="Labor hours" type="number" step="0.01" min="0" value={laborHours} onChange={(event) => setLaborHours(event.target.value)} />
          <Input label="Labor cost" type="number" step="0.01" min="0" value={laborCost} onChange={(event) => setLaborCost(event.target.value)} />
          <Input label="Parts cost" type="number" step="0.01" min="0" value={partsCost} onChange={(event) => setPartsCost(event.target.value)} />
          <Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={complete.isPending}>Complete</Button>
        </div>
      </Modal>
    </div>
  );
}

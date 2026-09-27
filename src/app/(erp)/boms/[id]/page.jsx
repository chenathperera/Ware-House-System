"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Archive, Edit, Plus } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Badge from "../../../../components/ui/Badge.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import { useBom, useCheckAvailability, useDeleteBom } from "../../../../client/features/boms/useBoms.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function BomDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data } = useBom(id);
  const bom = data?.data;
  const availability = useCheckAvailability(id, bom?.outputQuantity);
  const remove = useDeleteBom();
  const [archive, setArchive] = useState(false);
  const archiveBom = async () => {
    await remove.mutateAsync(id);
    router.push("/boms");
  };

  if (!bom) {
    return <div className="py-16 text-center">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={`${bom.bomCode} — ${bom.name}`}
        description={`Version ${bom.version}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/boms/${id}/edit`)}>
              <Edit size={16} />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setArchive(true)}>
              <Archive size={16} />
              Archive
            </Button>
            <Button variant="primary" onClick={() => router.push(`/production-orders/new?bomId=${id}`)}>
              <Plus size={16} />
              Create Production Order
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="p-6">
            <p><b>Finished Product:</b> {bom.finishedProductName} ({bom.finishedProductCode})</p>
            <p><b>Output:</b> {bom.outputQuantity} {bom.outputUnitOfMeasure}</p>
            <p><b>Status:</b> <Badge>{bom.status}</Badge></p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-3">Components / Raw Materials</h3>
            {bom.components.map((item) => (
              <div key={item._id} className="flex justify-between border-b py-2">
                <span>{item.productName} ({item.productCode})</span>
                <span>{item.quantity} {item.unitOfMeasure} + {item.wastagePercent || 0}% · {money(item.standardCost)}</span>
              </div>
            ))}
          </Card>
          <Card className="p-6">
            <h3>Material Availability</h3>
            {availability.data?.data?.components.map((item) => (
              <p key={String(item.productId)}>
                {item.productName}: required {item.required}, available {item.available} {item.isSufficient ? "OK" : `Short ${item.shortage}`}
              </p>
            ))}
          </Card>
          {bom.notes && <Card className="p-6"><h3>Notes</h3><p>{bom.notes}</p></Card>}
        </div>
        <Card className="h-fit p-6">
          <h3>Costing</h3>
          <p>Material: {money(bom.totalMaterialCost)}</p>
          <p>Labor: {money(bom.totalLaborCost)}</p>
          <p>Overhead: {money(bom.totalOverheadCost)}</p>
          <p>Total: {money(bom.totalCost)}</p>
          <p>Cost/Unit: {money(bom.costPerUnit)}</p>
        </Card>
      </div>
      <ConfirmDialog isOpen={archive} onClose={() => setArchive(false)} onConfirm={archiveBom} title="Archive BOM" message={`Archive "${bom.name}"? Production orders using this BOM will still work.`} loading={remove.isPending} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useCreateGrn } from "./useGrns.js";

const emptyItems = (purchaseOrder) =>
  (purchaseOrder?.items || [])
    .filter((item) => item.orderedQuantity - (item.receivedQuantity || 0) > 0)
    .map((item) => ({
      poLineItemId: item._id,
      productId: item.productId?._id || item.productId,
      productName: item.productName,
      productCode: item.productCode,
      orderedQuantity: item.orderedQuantity,
      alreadyReceived: item.receivedQuantity || 0,
      pending: item.orderedQuantity - (item.receivedQuantity || 0),
      receivedQuantity: item.orderedQuantity - (item.receivedQuantity || 0),
      acceptedQuantity: item.orderedQuantity - (item.receivedQuantity || 0),
      rejectedQuantity: 0,
      rejectionReason: "",
      discountPercent: 0,
      discountAmount: 0,
      freeQuantity: 0,
      unitPrice: item.unitPrice,
      batchNumber: "",
      expiryDate: "",
      unitOfMeasure: item.unitOfMeasure,
    }));

export default function PurchaseOrderGrnModal({ isOpen, onClose, purchaseOrder }) {
  const [items, setItems] = useState([]);
  const [supplierDeliveryNoteNumber, setSupplierDeliveryNoteNumber] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");
  const [billDiscountPercent, setBillDiscountPercent] = useState("");
  const [billDiscountAmount, setBillDiscountAmount] = useState("");
  const create = useCreateGrn();

  /* eslint-disable react-hooks/set-state-in-effect -- Form values intentionally hydrate when the selected PO is opened. */
  useEffect(() => {
    if (!isOpen || !purchaseOrder) return;
    setItems(emptyItems(purchaseOrder));
    setSupplierDeliveryNoteNumber("");
    setSupplierInvoiceNumber("");
    setVehicleNumber("");
    setDriverName("");
    setNotes("");
    setBillDiscountPercent("");
    setBillDiscountAmount("");
  }, [isOpen, purchaseOrder]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      const received = +next.receivedQuantity || 0;
      const rejected = +next.rejectedQuantity || 0;
      if (field === "receivedQuantity" || field === "rejectedQuantity") {
        next.acceptedQuantity = Math.max(0, received - rejected);
      }
      const lineTotal = (+next.acceptedQuantity || 0) * (+next.unitPrice || 0);
      if (["receivedQuantity", "rejectedQuantity", "discountPercent"].includes(field)) {
        next.discountAmount = +next.discountPercent > 0 ? (lineTotal * (+next.discountPercent) / 100).toFixed(2) : "";
      }
      if (field === "discountAmount") next.discountPercent = value && lineTotal > 0 ? ((+value / lineTotal) * 100).toFixed(2) : "";
      return next;
    }));
  };
  const submit = async () => {
    const toReceive = items.filter((item) => +item.receivedQuantity > 0);
    if (!toReceive.length) return toast.error("At least one item must be received");
    await create.mutateAsync({
      purchaseOrderId: purchaseOrder._id,
      warehouseId: purchaseOrder.deliverTo?.warehouseId?._id || purchaseOrder.deliverTo?.warehouseId,
      supplierDeliveryNoteNumber: supplierDeliveryNoteNumber || undefined,
      supplierInvoiceNumber: supplierInvoiceNumber || undefined,
      vehicleNumber: vehicleNumber || undefined,
      driverName: driverName || undefined,
      notes: notes || undefined,
      billDiscountPercent: +billDiscountPercent || 0,
      billDiscountAmount: +billDiscountAmount || 0,
      items: toReceive.map((item) => ({ poLineItemId: item.poLineItemId, productId: item.productId, receivedQuantity: +item.receivedQuantity, acceptedQuantity: +item.acceptedQuantity, rejectedQuantity: +item.rejectedQuantity || 0, rejectionReason: item.rejectionReason || undefined, discountPercent: +item.discountPercent || 0, discountAmount: +item.discountAmount || 0, freeQuantity: +item.freeQuantity || 0, unitPrice: +item.unitPrice, batchNumber: item.batchNumber || undefined, expiryDate: item.expiryDate || undefined })),
    });
    onClose();
  };

  return <Modal isOpen={isOpen} onClose={onClose} title={`Receive Goods — PO ${purchaseOrder?.poNumber}`} size="xl"><div className="space-y-4 p-6"><div className="grid grid-cols-2 gap-4"><Input label="Supplier Delivery Note #" value={supplierDeliveryNoteNumber} onChange={(event) => setSupplierDeliveryNoteNumber(event.target.value)} /><Input label="Supplier Invoice #" value={supplierInvoiceNumber} onChange={(event) => setSupplierInvoiceNumber(event.target.value)} /><Input label="Vehicle Number" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} /><Input label="Driver Name" value={driverName} onChange={(event) => setDriverName(event.target.value)} /></div>{items.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">All items fully received on this PO.</p> : <div><h4 className="mb-2 text-sm font-semibold text-gray-700">Items</h4><div className="space-y-3">{items.map((item, index) => <div key={item.poLineItemId} className="rounded-lg border p-3"><div className="mb-2 flex justify-between"><div><p className="text-sm font-medium">{item.productName}</p><p className="font-mono text-xs text-gray-500">{item.productCode}</p></div><p className="text-xs text-gray-500">Ordered: {item.orderedQuantity} · Already received: {item.alreadyReceived} · Pending: {item.pending}</p></div><div className="grid grid-cols-5 gap-2"><Input label="Received Qty" type="number" step="0.01" min="0" max={item.pending} value={item.receivedQuantity} onChange={(event) => updateItem(index, "receivedQuantity", event.target.value)} /><Input label="Rejected Qty" type="number" step="0.01" min="0" value={item.rejectedQuantity} onChange={(event) => updateItem(index, "rejectedQuantity", event.target.value)} /><Input label="Accepted" type="number" value={item.acceptedQuantity} disabled /><Input label="Batch #" value={item.batchNumber} onChange={(event) => updateItem(index, "batchNumber", event.target.value)} /><Input label="Expiry" type="date" value={item.expiryDate} onChange={(event) => updateItem(index, "expiryDate", event.target.value)} /></div><div className="mt-2 grid grid-cols-4 gap-2 border-t pt-2"><Input label="Free Qty" type="number" value={item.freeQuantity} onChange={(event) => updateItem(index, "freeQuantity", event.target.value)} /><Input label="Discount (%)" type="number" value={item.discountPercent} onChange={(event) => updateItem(index, "discountPercent", event.target.value)} /><Input label="Discount (Rs)" type="number" value={item.discountAmount} onChange={(event) => updateItem(index, "discountAmount", event.target.value)} /></div>{+item.rejectedQuantity > 0 && <div className="mt-2"><Input label="Rejection Reason" value={item.rejectionReason} onChange={(event) => updateItem(index, "rejectionReason", event.target.value)} /></div>}</div>)}</div></div>}<div className="grid grid-cols-2 gap-4"><Input label="Bill Discount (%)" type="number" value={billDiscountPercent} onChange={(event) => { setBillDiscountPercent(event.target.value); if (event.target.value) setBillDiscountAmount(""); }} /><Input label="Bill Discount (Rs)" type="number" value={billDiscountAmount} onChange={(event) => { setBillDiscountAmount(event.target.value); if (event.target.value) setBillDiscountPercent(""); }} /></div><Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></div><div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} loading={create.isPending} disabled={items.length === 0 || !items.some((item) => +item.receivedQuantity > 0)}>Confirm Receipt</Button></div></Modal>;
}

"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import { useProducts } from "../products/useProducts.js";
import { useSuppliers } from "../suppliers/useSuppliers.js";
import { useWarehouses } from "../warehouses/useWarehouses.js";
import { calculateReceiptTotals, directLine, updateReceiptLine } from "./grnFormState.js";
import { useCreateGrn } from "./useGrns.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value || 0);

export default function DirectGrnModal({ isOpen, onClose }) {
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState([directLine()]);
  const [billDiscountPercent, setBillDiscountPercent] = useState("");
  const [billDiscountAmount, setBillDiscountAmount] = useState("");
  const create = useCreateGrn();
  const { data: suppliersData } = useSuppliers({ status: "active" });
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const { data: productsData } = useProducts({ limit: 500 });
  const products = productsData?.data || [];
  const totals = calculateReceiptTotals(items, billDiscountPercent, billDiscountAmount);

  const reset = () => {
    setSupplierId("");
    setWarehouseId("");
    setItems([directLine()]);
    setBillDiscountPercent("");
    setBillDiscountAmount("");
  };
  const close = () => { reset(); onClose(); };
  const submit = async () => {
    if (!supplierId || !warehouseId) return toast.error("Select supplier and warehouse");
    const validItems = items.filter((item) => item.productId && item.receivedQuantity > 0);
    if (!validItems.length) return toast.error("Add at least one item");
    await create.mutateAsync({
      supplierId,
      warehouseId,
      billDiscountPercent: +billDiscountPercent || 0,
      billDiscountAmount: +billDiscountAmount || 0,
      items: validItems.map((item) => ({
        ...item,
        receivedQuantity: +item.receivedQuantity,
        acceptedQuantity: +item.receivedQuantity,
        unitPrice: +item.unitPrice,
        discountPercent: +item.discountPercent || 0,
        discountAmount: +item.discountAmount || 0,
        freeQuantity: +item.freeQuantity || 0,
      })),
    });
    close();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="New Direct GRN (No PO)" size="lg">
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Supplier" required options={(suppliersData?.data || []).map((supplier) => ({ value: supplier._id, label: supplier.displayName }))} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} />
          <Select label="Warehouse" required options={(warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: warehouse.name }))} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold">Items</h4><Button size="sm" variant="outline" onClick={() => setItems((current) => [...current, directLine()])}>Add Item</Button></div>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {items.map((item, index) => <div key={index} className="space-y-2 rounded border p-3"><div className="flex items-start justify-between"><div className="mr-2 flex-1"><Select placeholder="Product..." options={products.map((product) => ({ value: product._id, label: product.name }))} value={item.productId} onChange={(event) => setItems((current) => updateReceiptLine(current, index, "productId", event.target.value, products))} /></div><Button variant="outline" size="sm" onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="mt-1 text-red-600">Remove</Button></div><div className="grid grid-cols-5 items-end gap-2"><Input type="number" label="Qty" value={item.receivedQuantity} onChange={(event) => setItems((current) => updateReceiptLine(current, index, "receivedQuantity", event.target.value, products))} /><Input type="number" label="Unit Price" value={item.unitPrice} onChange={(event) => setItems((current) => updateReceiptLine(current, index, "unitPrice", event.target.value, products))} /><Input type="number" label="Free Qty" value={item.freeQuantity} onChange={(event) => setItems((current) => updateReceiptLine(current, index, "freeQuantity", event.target.value, products))} /><Input type="number" label="Disc(%)" value={item.discountPercent} onChange={(event) => setItems((current) => updateReceiptLine(current, index, "discountPercent", event.target.value, products))} /><Input type="number" label="Disc(Rs)" value={item.discountAmount} onChange={(event) => setItems((current) => updateReceiptLine(current, index, "discountAmount", event.target.value, products))} /></div></div>)}
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 border-t pt-4 md:flex-row md:justify-between md:items-center"><div className="grid w-full grid-cols-2 gap-4 md:max-w-md"><Input label="Bill Discount (%)" type="number" step="0.01" min="0" max="100" value={billDiscountPercent} onChange={(event) => { setBillDiscountPercent(event.target.value); if (event.target.value) setBillDiscountAmount(""); }} /><Input label="Bill Discount (Rs)" type="number" step="0.01" min="0" value={billDiscountAmount} onChange={(event) => { setBillDiscountAmount(event.target.value); if (event.target.value) setBillDiscountPercent(""); }} /></div><div className="w-full space-y-1.5 rounded-lg border bg-gray-50 p-4 text-sm md:max-w-xs"><div className="flex justify-between"><span>Subtotal:</span><span>{money(totals.subtotal)}</span></div>{totals.lineDiscounts > 0 && <div className="flex justify-between text-red-600"><span>Line Discounts:</span><span>-{money(totals.lineDiscounts)}</span></div>}{totals.totalBillDiscount > 0 && <div className="flex justify-between text-red-600"><span>Bill Discount:</span><span>-{money(totals.totalBillDiscount)}</span></div>}<div className="flex justify-between border-t pt-1.5 text-base font-bold"><span>Grand Total:</span><span>{money(totals.grandTotal)}</span></div></div></div>
        <div className="flex gap-2 pt-4"><Button variant="primary" fullWidth onClick={submit} loading={create.isPending}>Confirm Receipt</Button><Button variant="outline" fullWidth onClick={close}>Cancel</Button></div>
      </div>
    </Modal>
  );
}

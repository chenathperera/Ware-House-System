"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { productsApi } from "../products/productsApi.js";
import { suppliersApi } from "../suppliers/suppliersApi.js";
import { useWarehouses } from "../warehouses/useWarehouses.js";
import { useCreatePurchaseOrder, usePurchaseOrder, useUpdatePurchaseOrder } from "./usePurchaseOrders.js";

const newLine = () => ({ productId: "", orderedQuantity: 1, unitPrice: 0, discountPercent: 0, discountAmount: 0, taxRate: 18, taxable: true });
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const formatDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";

function calculateLine(item) {
  const subtotal = (+item.orderedQuantity || 0) * (+item.unitPrice || 0);
  const discount = subtotal * (+item.discountPercent || 0) / 100 + (+item.discountAmount || 0);
  const taxableAmount = item.taxable ? subtotal - discount : 0;
  const tax = taxableAmount * (+item.taxRate || 0) / 100;
  return { subtotal, discount, tax, total: taxableAmount + tax };
}

export default function PurchaseOrderForm({ purchaseOrderId }) {
  const router = useRouter();
  const isEdit = Boolean(purchaseOrderId);
  const [header, setHeader] = useState({ supplierId: "", warehouseId: "", poDate: "", expectedDeliveryDate: "", shippingTerms: "", shippingCost: 0, otherCharges: 0, notes: "", internalNotes: "" });
  const [items, setItems] = useState([]);
  const { data: existingData, isLoading: loadingPo } = usePurchaseOrder(purchaseOrderId);
  const { data: suppliersData } = useQuery({ queryKey: ["suppliers", "active"], queryFn: () => suppliersApi.list({ status: "active", limit: 500 }) });
  const { data: productsData } = useQuery({ queryKey: ["products", "active"], queryFn: () => productsApi.list({ status: "active", limit: 500 }) });
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();
  const po = existingData?.data;

  useEffect(() => {
    if (!po) return;
    setHeader({ supplierId: po.supplierId?._id || po.supplierId || "", warehouseId: po.deliverTo?.warehouseId?._id || po.deliverTo?.warehouseId || "", poDate: formatDate(po.poDate), expectedDeliveryDate: formatDate(po.expectedDeliveryDate), shippingTerms: po.shippingTerms || "", shippingCost: po.shippingCost || 0, otherCharges: po.otherCharges || 0, notes: po.notes || "", internalNotes: po.internalNotes || "" });
    setItems(po.items.map((item) => ({ productId: item.productId?._id || item.productId, orderedQuantity: item.orderedQuantity, unitPrice: item.unitPrice, discountPercent: item.discountPercent || 0, discountAmount: item.discountAmount || 0, taxRate: item.taxRate || 0, taxable: item.taxable ?? true })));
  }, [po]);

  const suppliers = suppliersData?.data || [];
  const products = productsData?.data || [];
  const supplier = suppliers.find((item) => item._id === header.supplierId);
  const totals = useMemo(() => { const lines = items.map(calculateLine); const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0); const discount = lines.reduce((sum, line) => sum + line.discount, 0); const tax = lines.reduce((sum, line) => sum + line.tax, 0); return { subtotal, discount, tax, grand: subtotal - discount + tax + (+header.shippingCost || 0) + (+header.otherCharges || 0) }; }, [items, header.shippingCost, header.otherCharges]);
  const productOptions = products.map((product) => ({ value: product._id, label: `${product.name} — ${product.productCode}` }));
  const supplierOptions = suppliers.map((item) => ({ value: item._id, label: `${item.displayName} (${item.supplierCode})` }));
  const warehouseOptions = (warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }));
  const setField = (field, value) => setHeader((current) => ({ ...current, [field]: value }));
  const updateItem = (index, field, value) => setItems((current) => current.map((item, itemIndex) => { if (itemIndex !== index) return item; const next = { ...item, [field]: value }; if (field === "productId") { const product = products.find((entry) => entry._id === value); if (product) { next.unitPrice = product.costs?.lastPurchaseCost || 0; next.taxRate = product.tax?.taxRate || 0; next.taxable = product.tax?.taxable ?? true; } } return next; }));
  const payload = (status) => ({ supplierId: header.supplierId, deliverTo: { warehouseId: header.warehouseId }, poDate: header.poDate || undefined, expectedDeliveryDate: header.expectedDeliveryDate || undefined, shippingTerms: header.shippingTerms || undefined, shippingCost: +header.shippingCost || 0, otherCharges: +header.otherCharges || 0, notes: header.notes || undefined, internalNotes: header.internalNotes || undefined, status, items: items.map((item) => ({ productId: item.productId, orderedQuantity: +item.orderedQuantity, unitPrice: +item.unitPrice, discountPercent: +item.discountPercent || 0, discountAmount: +item.discountAmount || 0, taxRate: +item.taxRate || 0, taxable: item.taxable })) });
  const submit = async (draft) => { if (!header.supplierId) return toast.error("Select a supplier"); if (!header.warehouseId) return toast.error("Select a delivery warehouse"); if (!items.length) return toast.error("Add at least one item"); if (items.some((item) => !item.productId || !item.orderedQuantity)) return toast.error("Each item needs a product and quantity"); try { const data = payload(draft ? "draft" : "approved"); const result = isEdit ? await updateMutation.mutateAsync({ id: purchaseOrderId, data }) : await createMutation.mutateAsync(data); router.push(`/purchase-orders/${result.data._id || purchaseOrderId}`); } catch {} };
  if (isEdit && loadingPo) return <div className="py-16 text-center text-gray-500">Loading...</div>;
  if (isEdit && po && !["draft", "pending_approval"].includes(po.status)) return <div className="py-16 text-center text-gray-500">This purchase order can no longer be edited.</div>;

  return <div>
    <PageHeader title={isEdit ? "Edit Purchase Order" : "New Purchase Order"} description="Order stock from a supplier" actions={<Button variant="outline" onClick={() => router.push("/purchase-orders")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold">Supplier & Delivery</h3><div className="space-y-4"><Select label="Supplier" required placeholder="Select supplier..." options={supplierOptions} value={header.supplierId} onChange={(event) => setField("supplierId", event.target.value)} />{supplier && <div className="rounded-lg bg-gray-50 p-3 text-sm">Terms: {supplier.paymentTerms?.type?.toUpperCase()}{supplier.paymentTerms?.type === "credit" && ` (${supplier.paymentTerms.creditDays}d)`}</div>}<Select label="Deliver To Warehouse" required options={warehouseOptions} value={header.warehouseId} onChange={(event) => setField("warehouseId", event.target.value)} /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="PO Date" type="date" value={header.poDate} onChange={(event) => setField("poDate", event.target.value)} /><Input label="Expected Delivery Date" type="date" value={header.expectedDeliveryDate} onChange={(event) => setField("expectedDeliveryDate", event.target.value)} /></div><Select label="Shipping Terms" placeholder="Select..." options={["FOB", "CIF", "EXW", "DDP"].map((value) => ({ value, label: value }))} value={header.shippingTerms} onChange={(event) => setField("shippingTerms", event.target.value)} /></div></Card><Card className="p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">Items</h3><Button variant="outline" size="sm" onClick={() => setItems((current) => [...current, newLine()])}><Plus size={14} className="mr-1" /> Add Item</Button></div>{!items.length ? <p className="py-8 text-center text-sm text-gray-500">No items. Click “Add Item” to start.</p> : <div className="space-y-3">{items.map((item, index) => { const line = calculateLine(item); return <div key={index} className="rounded-lg border p-3"><div className="mb-2 flex items-start gap-2"><span className="mt-2 w-6 text-xs text-gray-500">{index + 1}</span><div className="flex-1"><Select placeholder="Select product..." options={productOptions} value={item.productId} onChange={(event) => updateItem(index, "productId", event.target.value)} /></div><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-6"><Input label="Qty" type="number" step="0.01" min="0.01" value={item.orderedQuantity} onChange={(event) => updateItem(index, "orderedQuantity", event.target.value)} /><Input label="Unit Price" type="number" step="0.01" min="0" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} /><Input label="Disc %" type="number" min="0" max="100" value={item.discountPercent} onChange={(event) => updateItem(index, "discountPercent", event.target.value)} /><Input label="Disc Amt" type="number" min="0" value={item.discountAmount} onChange={(event) => updateItem(index, "discountAmount", event.target.value)} /><Input label="Tax %" type="number" min="0" value={item.taxRate} onChange={(event) => updateItem(index, "taxRate", event.target.value)} /><div><label className="mb-1 block text-sm font-medium">Line Total</label><p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium">{money(line.total)}</p></div></div></div>; })}</div>}</Card><Card className="p-6"><Textarea label="Notes to Supplier" rows={2} value={header.notes} onChange={(event) => setField("notes", event.target.value)} /><Textarea label="Internal Notes" rows={2} value={header.internalNotes} onChange={(event) => setField("internalNotes", event.target.value)} /></Card></div><div><Card className="sticky top-6 p-6"><h3 className="mb-4 text-sm font-semibold">Summary</h3><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div><div className="flex justify-between text-red-600"><span>Discount</span><span>-{money(totals.discount)}</span></div><div className="flex justify-between"><span>Tax</span><span>{money(totals.tax)}</span></div><Input label="Shipping" type="number" min="0" value={header.shippingCost} onChange={(event) => setField("shippingCost", event.target.value)} /><Input label="Other Charges" type="number" min="0" value={header.otherCharges} onChange={(event) => setField("otherCharges", event.target.value)} /><div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Grand Total</span><span className="text-primary-600">{money(totals.grand)}</span></div></div><div className="mt-6 space-y-2"><Button fullWidth variant="primary" loading={createMutation.isPending || updateMutation.isPending} disabled={!header.supplierId || !header.warehouseId || items.length === 0} onClick={() => submit(false)}><Save size={16} className="mr-1.5" /> {isEdit ? "Update Purchase Order" : "Create & Approve"}</Button>{!isEdit && <Button fullWidth variant="outline" loading={createMutation.isPending} disabled={!header.supplierId || !header.warehouseId || items.length === 0} onClick={() => submit(true)}>Save as Draft</Button>}</div></Card></div></div>
  </div>;
}

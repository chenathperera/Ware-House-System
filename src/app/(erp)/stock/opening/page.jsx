"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Input from "../../../../components/ui/Input.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { productsApi } from "../../../../client/features/products/productsApi.js";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";
import { useOpeningStock } from "../../../../client/features/stock/useStock.js";

const blankLine = () => ({ productId: "", quantity: "", costPerUnit: "" });
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function OpeningStockPage() {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([blankLine()]);
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const { data: productsData } = useQuery({ queryKey: ["products", "active", "all"], queryFn: () => productsApi.list({ status: "active", limit: 500 }) });
  const mutation = useOpeningStock();
  const warehouseOptions = (warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }));
  const productOptions = (productsData?.data || []).map((product) => ({ value: product._id, label: `${product.name} — ${product.productCode}` }));
  const updateLine = (index, field, value) => setLines((current) => current.map((line, lineIndex) => { if (lineIndex !== index) return line; const next = { ...line, [field]: value }; if (field === "productId" && value && !next.costPerUnit) { const product = productsData?.data?.find((item) => item._id === value); next.costPerUnit = product?.costs?.lastPurchaseCost || product?.basePrice || 0; } return next; }));
  const submit = async () => { if (!warehouseId) return toast.error("Select warehouse"); const items = lines.filter((line) => line.productId && line.quantity); if (!items.length) return toast.error("Add at least one item"); try { await mutation.mutateAsync({ warehouseId, items: items.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), costPerUnit: Number(line.costPerUnit) || 0 })), notes: notes || undefined }); router.push("/stock"); } catch {} };
  const totalValue = lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0), 0);
  return <div>
    <PageHeader title="Opening Stock Entry" description="Record initial inventory into your warehouse" actions={<Button variant="outline" onClick={() => router.push("/stock")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Target Warehouse</h3><Select label="Warehouse" required placeholder="Select warehouse..." options={warehouseOptions} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} /></Card><Card className="p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Stock Items</h3><Button variant="outline" size="sm" onClick={() => setLines((current) => [...current, blankLine()])}><Plus size={14} className="mr-1" /> Add Line</Button></div><div className="space-y-3">{lines.map((line, index) => <div key={index} className="rounded-lg border border-gray-200 p-3"><div className="flex items-start gap-2"><span className="mt-2 w-6 text-xs text-gray-500">{index + 1}</span><div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-6"><div className="sm:col-span-3"><Select placeholder="Select product..." options={productOptions} value={line.productId} onChange={(event) => updateLine(index, "productId", event.target.value)} /></div><Input type="number" step="0.01" min="0.01" placeholder="Qty" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /><Input type="number" step="0.01" min="0" placeholder="Cost" value={line.costPerUnit} onChange={(event) => updateLine(index, "costPerUnit", event.target.value)} /><div className="rounded-lg bg-gray-50 px-3 py-2 text-right text-sm font-medium">{money((Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0))}</div></div>{lines.length > 1 && <button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="mt-0.5 rounded p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>}</div></div>)}</div><div className="mt-4 flex justify-end border-t pt-4"><div className="text-right"><p className="text-xs text-gray-500">Total value</p><p className="text-xl font-bold text-primary-600">{money(totalValue)}</p></div></div></Card><Card className="p-6"><Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></Card></div><div><Card className="sticky top-6 p-6"><PackagePlus size={24} className="mb-3 text-primary-600" /><h3 className="mb-2 font-semibold">Opening Stock</h3><p className="mb-4 text-sm text-gray-600">Use this to enter your existing inventory when starting. Each line creates a stock movement record for the audit trail.</p><div className="mb-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Lines</span><span>{lines.filter((line) => line.productId).length}</span></div><div className="flex justify-between font-medium"><span>Total Value</span><span className="text-primary-600">{money(totalValue)}</span></div></div><Button variant="primary" fullWidth onClick={submit} loading={mutation.isPending} disabled={!warehouseId || !lines.some((line) => line.productId && line.quantity)}><Save size={16} className="mr-1.5" /> Save Opening Stock</Button></Card></div></div>
  </div>;
}

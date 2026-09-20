"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Save, Settings2, Trash2 } from "lucide-react";
import AdminVerificationModal from "../../../../components/auth/AdminVerificationModal.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Input from "../../../../components/ui/Input.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { useAdminVerify } from "../../../../client/features/auth/useAdminVerify.js";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";
import { stockApi } from "../../../../client/features/stock/stockApi.js";
import { useAdjustStock } from "../../../../client/features/stock/useStock.js";
import { useAuthStore } from "../../../../client/store/authStore.js";

const reasons = [{ value: "physical_count", label: "Physical count correction" }, { value: "damage", label: "Damage" }, { value: "expiry", label: "Expired" }, { value: "shrinkage", label: "Shrinkage / loss" }, { value: "found", label: "Found stock" }, { value: "data_correction", label: "Data correction" }, { value: "other", label: "Other" }];
const blankLine = () => ({ productId: "", adjustmentQuantity: "", reason: "physical_count" });

export default function StockAdjustmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canAdjust = user?.role === "admin" || user?.role === "inventory_admin" || user?.permissions?.includes("adjust_stock");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([blankLine()]);
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const { data: stockData } = useQuery({ queryKey: ["stock", "source", warehouseId], queryFn: () => stockApi.list({ warehouseId, limit: 500 }), enabled: !!warehouseId });
  const mutation = useAdjustStock();
  const verify = useAdminVerify();
  const options = (warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }));
  const products = (stockData?.data || []).map((stock) => ({ value: stock.productId._id, label: `${stock.productName} — On hand: ${stock.quantities.onHand}`, onHand: stock.quantities.onHand }));
  const updateLine = (index, field, value) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  const submit = () => { if (!warehouseId) return toast.error("Select warehouse"); const items = lines.filter((line) => line.productId && line.adjustmentQuantity && line.adjustmentQuantity !== "0"); if (!items.length) return toast.error("Add at least one adjustment"); verify.requestAdminVerify(async () => { try { await mutation.mutateAsync({ warehouseId, items: items.map((line) => ({ productId: line.productId, adjustmentQuantity: Number(line.adjustmentQuantity), reason: line.reason })), notes: notes || undefined }); router.push("/stock"); } catch {} }, { title: "Authorize Stock Adjustment", message: "This adjustment will permanently change inventory levels. Please verify your admin credentials." }); };
  if (!canAdjust) return <div className="flex flex-col items-center justify-center py-20"><Settings2 size={64} className="mb-4 text-gray-300" /><h2 className="text-xl font-bold text-gray-900">Access Restricted</h2><p className="text-gray-500">You do not have permission to perform stock adjustments.</p><Button variant="outline" className="mt-6" onClick={() => router.push("/stock")}>Back to Stock</Button></div>;
  return <div><PageHeader title="Stock Adjustment" description="Correct stock levels with a full audit trail" actions={<Button variant="outline" onClick={() => router.push("/stock")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>} /><div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Warehouse</h3><Select label="Warehouse" required placeholder="Select warehouse..." options={options} value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setLines([blankLine()]); }} /></Card><Card className="p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Adjustments</h3><Button variant="outline" size="sm" disabled={!warehouseId} onClick={() => setLines((current) => [...current, blankLine()])}><Plus size={14} className="mr-1" /> Add Line</Button></div><p className="mb-3 text-xs text-gray-500">Use positive numbers to add stock, negative to remove. Example: -5 means reduce by 5 units.</p>{!warehouseId ? <p className="py-8 text-center text-sm text-gray-500">Select warehouse first</p> : <div className="space-y-3">{lines.map((line, index) => { const selected = products.find((product) => product.value === line.productId); const next = selected ? selected.onHand + (Number(line.adjustmentQuantity) || 0) : 0; const negative = selected && next < 0; return <div key={index} className="rounded-lg border border-gray-200 p-3"><div className="flex items-start gap-2"><span className="mt-2 w-6 text-xs text-gray-500">{index + 1}</span><div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-6"><div className="sm:col-span-3"><Select placeholder="Select product..." options={products} value={line.productId} onChange={(event) => updateLine(index, "productId", event.target.value)} /></div><Input type="number" step="0.01" placeholder="+/- Qty" value={line.adjustmentQuantity} error={negative ? "Would go negative" : undefined} onChange={(event) => updateLine(index, "adjustmentQuantity", event.target.value)} /><div className="sm:col-span-2"><Select options={reasons} value={line.reason} onChange={(event) => updateLine(index, "reason", event.target.value)} /></div></div>{lines.length > 1 && <button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="mt-0.5 rounded p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>}</div>{selected && <p className="ml-8 mt-1 text-xs text-gray-500">{selected.onHand} → <span className={negative ? "text-red-600" : "font-medium"}>{next}</span></p>}</div>; })}</div>}</Card><Card className="p-6"><Textarea label="Overall Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></Card></div><div><Card className="sticky top-6 p-6"><Settings2 size={24} className="mb-3 text-primary-600" /><h3 className="mb-2 font-semibold">Stock Adjustment</h3><p className="mb-4 text-sm text-gray-600">Adjustments are logged permanently with the reason. Use them for corrections after physical counts, damage, or data errors.</p><Button variant="primary" fullWidth onClick={submit} loading={mutation.isPending} disabled={!warehouseId || !lines.some((line) => line.productId && line.adjustmentQuantity)}><Save size={16} className="mr-1.5" /> Save Adjustment</Button></Card></div></div><AdminVerificationModal isOpen={verify.isVerifyModalOpen} onClose={verify.closeVerifyModal} onVerified={verify.handleVerified} /></div>;
}

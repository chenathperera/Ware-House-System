"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRightLeft, Plus, Save, Trash2 } from "lucide-react";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Input from "../../../../components/ui/Input.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";
import { stockApi } from "../../../../client/features/stock/stockApi.js";
import { useTransferStock } from "../../../../client/features/stock/useStock.js";

const blankLine = () => ({ productId: "", quantity: "" });

export default function StockTransferPage() {
  const router = useRouter();
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([blankLine()]);
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const { data: stockData } = useQuery({ queryKey: ["stock", "source", fromWarehouseId], queryFn: () => stockApi.list({ warehouseId: fromWarehouseId, limit: 500 }), enabled: !!fromWarehouseId });
  const mutation = useTransferStock();
  useEffect(() => { setLines([blankLine()]); }, [fromWarehouseId]);
  const warehouseOptions = (warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }));
  const products = (stockData?.data || []).filter((stock) => stock.quantities.onHand - stock.quantities.reserved > 0).map((stock) => ({ value: stock.productId._id, label: `${stock.productName} — Available: ${stock.quantities.onHand - stock.quantities.reserved}`, available: stock.quantities.onHand - stock.quantities.reserved }));
  const updateLine = (index, field, value) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  const submit = async () => { if (!fromWarehouseId || !toWarehouseId) return toast.error("Select source and destination"); if (fromWarehouseId === toWarehouseId) return toast.error("Source and destination must differ"); const items = lines.filter((line) => line.productId && line.quantity); if (!items.length) return toast.error("Add at least one item"); try { await mutation.mutateAsync({ fromWarehouseId, toWarehouseId, items: items.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })), notes: notes || undefined }); router.push("/stock"); } catch {} };
  return <div><PageHeader title="Stock Transfer" description="Move stock between warehouses" actions={<Button variant="outline" onClick={() => router.push("/stock")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>} /><div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Route</h3><div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2 sm:gap-6"><Select label="From Warehouse" required placeholder="Select source..." options={warehouseOptions} value={fromWarehouseId} onChange={(event) => setFromWarehouseId(event.target.value)} /><Select label="To Warehouse" required placeholder="Select destination..." options={warehouseOptions.filter((option) => option.value !== fromWarehouseId)} value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)} /></div></Card><Card className="p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Items to Transfer</h3><Button variant="outline" size="sm" disabled={!fromWarehouseId} onClick={() => setLines((current) => [...current, blankLine()])}><Plus size={14} className="mr-1" /> Add Item</Button></div>{!fromWarehouseId ? <p className="py-8 text-center text-sm text-gray-500">Select source warehouse first</p> : products.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No stock available at source warehouse</p> : <div className="space-y-3">{lines.map((line, index) => { const selected = products.find((product) => product.value === line.productId); const exceeds = selected && Number(line.quantity) > selected.available; return <div key={index} className="rounded-lg border border-gray-200 p-3"><div className="flex items-start gap-2"><span className="mt-2 w-6 text-xs text-gray-500">{index + 1}</span><div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-4"><div className="sm:col-span-3"><Select placeholder="Select product..." options={products} value={line.productId} onChange={(event) => updateLine(index, "productId", event.target.value)} /></div><Input type="number" step="0.01" min="0.01" placeholder="Qty" value={line.quantity} error={exceeds ? `Max ${selected.available}` : undefined} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></div>{lines.length > 1 && <button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="mt-0.5 rounded p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>}</div></div>; })}</div>}</Card><Card className="p-6"><Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></Card></div><div><Card className="sticky top-6 p-6"><ArrowRightLeft size={24} className="mb-3 text-primary-600" /><h3 className="mb-2 font-semibold">Transfer Summary</h3><p className="mb-4 text-sm text-gray-600">Each item decreases at source and increases at destination. Two movements per line in the audit log.</p><Button variant="primary" fullWidth onClick={submit} loading={mutation.isPending} disabled={!fromWarehouseId || !toWarehouseId || !lines.some((line) => line.productId && line.quantity)}><Save size={16} className="mr-1.5" /> Execute Transfer</Button></Card></div></div></div>;
}

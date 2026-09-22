"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import EmptyState from "../../../../components/ui/EmptyState.jsx";
import Input from "../../../../components/ui/Input.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { useCreateBillFromGrn } from "../../../../client/features/bills/useBills.js";
import { grnsApi } from "../../../../client/features/grns/grnsApi.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function BillFromGrnPage() {
  const router = useRouter();
  const params = useSearchParams();
  const poId = params.get("poId");
  const [selectedIds, setSelectedIds] = useState([]);
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState(0);
  const { data } = useQuery({ queryKey: ["grns", poId], queryFn: () => grnsApi.list({ purchaseOrderId: poId, limit: 100 }), enabled: !!poId });
  const mutation = useCreateBillFromGrn();
  const grns = data?.data || [];
  const selectedGrns = grns.filter((grn) => selectedIds.includes(grn._id));
  const totalAmount = selectedGrns.reduce((sum, grn) => sum + (grn.totalAcceptedValue || 0), 0);
  const globalDiscount = +globalDiscountAmount || totalAmount * (+globalDiscountPercent || 0) / 100;
  const finalAmount = Math.max(0, totalAmount - globalDiscount);

  const changeDiscount = (field, value) => {
    if (field === "percent") {
      setGlobalDiscountPercent(value);
      setGlobalDiscountAmount(value ? ((totalAmount * (+value)) / 100).toFixed(2) : "");
    } else {
      setGlobalDiscountAmount(value);
      setGlobalDiscountPercent(value && totalAmount > 0 ? (((+value / totalAmount) * 100).toFixed(2)) : "");
    }
  };
  const toggle = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const submit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one GRN");
      return;
    }
    try {
      const result = await mutation.mutateAsync({ grnIds: selectedIds, supplierInvoiceNumber: supplierInvoice || undefined, billDate, notes: notes || undefined, globalDiscountPercent: +globalDiscountPercent || 0, globalDiscountAmount: +globalDiscountAmount || 0 });
      router.push(`/bills/${result.data._id}`);
    } catch { /* mutation toast preserves the original feedback path */ }
  };

  return <div>
    <PageHeader title="Create Bill from GRNs" actions={<Button variant="outline" onClick={() => router.back()}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>} />
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2"><Card>{grns.length === 0 ? <EmptyState title="No GRNs" description="No goods received notes to bill" /> : <table className="w-full"><thead className="border-b bg-gray-50"><tr><th className="w-10 px-4 py-2" /><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">GRN #</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Supplier</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Value</th></tr></thead><tbody className="divide-y">{grns.map((grn) => <tr key={grn._id}><td className="px-4 py-2"><input type="checkbox" checked={selectedIds.includes(grn._id)} onChange={() => toggle(grn._id)} /></td><td className="px-4 py-2 font-mono text-xs">{grn.grnNumber}</td><td className="px-4 py-2 text-sm">{new Date(grn.receiptDate).toLocaleDateString("en-LK")}</td><td className="px-4 py-2 text-sm">{grn.supplierId?.displayName}</td><td className="px-4 py-2 text-right text-sm">{money(grn.totalAcceptedValue)}</td></tr>)}</tbody></table>}</Card></div>
      <div><Card className="sticky top-6 p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Bill Details</h3><div className="space-y-3"><Input label="Supplier Invoice Number" placeholder="Their invoice #" value={supplierInvoice} onChange={(event) => setSupplierInvoice(event.target.value)} /><Input label="Bill Date" type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} /><Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /><div className="grid grid-cols-2 gap-4"><Input type="number" step="0.01" min="0" max="100" label="Bill Discount (%)" value={globalDiscountPercent} onChange={(event) => changeDiscount("percent", event.target.value)} /><Input type="number" step="0.01" min="0" label="Bill Discount (Rs)" value={globalDiscountAmount} onChange={(event) => changeDiscount("amount", event.target.value)} /></div><div className="space-y-1 border-t pt-3"><div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{money(totalAmount)}</span></div>{globalDiscount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{money(globalDiscount)}</span></div>}<div className="mt-2 flex justify-between text-base font-bold"><span className="text-gray-700">Grand Total</span><span className="text-primary-600">{money(finalAmount)}</span></div></div><Button variant="primary" fullWidth onClick={submit} loading={mutation.isPending} disabled={selectedIds.length === 0}><Save size={16} className="mr-1.5" /> Create Bill</Button></div></Card></div>
    </div>
  </div>;
}

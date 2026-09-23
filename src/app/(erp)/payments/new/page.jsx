"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Input from "../../../../components/ui/Input.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import api from "../../../../client/api/axios.js";
import { billsApi } from "../../../../client/features/bills/billsApi.js";
import { useCreatePayment } from "../../../../client/features/payments/usePayments.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value || 0);

export default function NewPaymentPage() {
  const [direction, setDirection] = useState("received");
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("bank_transfer");
  const [allocations, setAllocations] = useState([]);
  const [reference, setReference] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const mutation = useCreatePayment();
  const { data: suppliersData } = useQuery({ queryKey: ["suppliers", "active"], queryFn: () => api.get("/suppliers", { params: { status: "active", limit: 500 } }).then((response) => response.data), enabled: direction === "paid" });
  const { data: billsData } = useQuery({ queryKey: ["supplierBills", supplierId], queryFn: () => billsApi.list({ supplierId, paymentStatus: "unpaid,partially_paid,overdue", limit: 100 }), enabled: direction === "paid" && !!supplierId });
  const { data: accountsData } = useQuery({ queryKey: ["bank-accounts"], queryFn: () => api.get("/bank-accounts").then((response) => response.data) });
  const bills = billsData?.data || [];
  const allocated = allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
  const unallocated = +(amount - allocated).toFixed(2);
  const addBill = (bill) => setAllocations((current) => current.some((allocation) => allocation.documentId === bill._id) ? current : [...current, { documentType: "bill", documentId: bill._id, documentNumber: bill.billNumber, amount: bill.balanceDue }]);
  const removeAllocation = (index) => setAllocations((current) => current.filter((_, currentIndex) => currentIndex !== index));
  const submit = async () => {
    await mutation.mutateAsync({ direction, supplierId: direction === "paid" ? supplierId : undefined, amount: Number(amount), method, bankAccountId: bankAccountId || undefined, transactionReference: reference || undefined, allocations: allocations.filter((allocation) => allocation.amount > 0) });
  };
  return (
    <div>
      <PageHeader title="Record Payment" actions={<Link href="/payments"><Button variant="outline"><ArrowLeft size={16} className="mr-1.5" />Back</Button></Link>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4 p-6">
            <h3 className="font-semibold text-gray-700">Payment Info</h3>
            <div className="grid grid-cols-2 gap-3"><button onClick={() => setDirection("received")} className={`rounded-lg border p-3 ${direction === "received" ? "border-green-500 bg-green-50" : "border-gray-200"}`}>Money Received</button><button onClick={() => setDirection("paid")} className={`rounded-lg border p-3 ${direction === "paid" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>Money Paid</button></div>
            {direction === "paid" && <Select label="Supplier" required options={(suppliersData?.data || []).map((supplier) => ({ value: supplier._id, label: `${supplier.displayName} (${supplier.supplierCode})` }))} value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setAllocations([]); }} />}
            <Input label="Amount (LKR)" type="number" min="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Select label="Method" options={["cash", "bank_transfer", "cheque", "card", "mobile_wallet", "other"].map((value) => ({ value, label: value.replace("_", " ") }))} value={method} onChange={(event) => setMethod(event.target.value)} />
            {method !== "cash" && <Select label="Select Bank Account" options={(accountsData?.data || []).map((account) => ({ value: account._id, label: `${account.accountName} (${account.bankName})` }))} value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} />}
            <Input label="Transaction Reference (optional)" value={reference} onChange={(event) => setReference(event.target.value)} />
          </Card>
          {direction === "paid" && <Card className="p-6"><h3 className="mb-4 font-semibold text-gray-700">Apply to Invoices/Bills</h3>{allocations.map((allocation, index) => <div key={allocation.documentId} className="mb-2 flex items-center gap-2"><Badge>{allocation.documentNumber}</Badge><Input type="number" value={allocation.amount} onChange={(event) => setAllocations((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(event.target.value) } : item))} /><button onClick={() => removeAllocation(index)} className="text-red-600"><Trash2 size={16} /></button></div>)}{bills.map((bill) => <button key={bill._id} onClick={() => addBill(bill)} className="mb-1 flex w-full justify-between rounded border p-2 text-sm"><span>{bill.billNumber}</span><span>{money(bill.balanceDue)}</span></button>)}</Card>}
        </div>
        <Card className="h-fit p-6"><h3 className="mb-4 font-semibold">Summary</h3><p>Payment: {money(amount)}</p><p>Allocated: {money(allocated)}</p><p className="border-t pt-2">Unallocated: {money(unallocated)}</p><Button variant="primary" fullWidth className="mt-4" onClick={submit} loading={mutation.isPending} disabled={!amount || unallocated < 0}><Save size={16} className="mr-1.5" />Record Payment</Button></Card>
      </div>
    </div>
  );
}

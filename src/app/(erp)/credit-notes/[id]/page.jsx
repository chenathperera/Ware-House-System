"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Badge from "../../../../components/ui/Badge.jsx";
import Modal from "../../../../components/ui/Modal.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Input from "../../../../components/ui/Input.jsx";
import { useCreditNote, useApplyCreditNote } from "../../../../client/features/creditNotes/useCreditNotes.js";
import { invoicesApi } from "../../../../client/features/invoices/invoicesApi.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const date = (value) => new Date(value).toLocaleDateString("en-LK");

export default function CreditNoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, isLoading } = useCreditNote(id);
  const applyMutation = useApplyCreditNote();
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [applyAmount, setApplyAmount] = useState(0);
  const creditNote = data?.data;
  const { data: invoicesData } = useQuery({ queryKey: ["customerOpenInvoices", creditNote?.customerId?._id], queryFn: () => invoicesApi.list({ customerId: creditNote?.customerId?._id, paymentStatus: "unpaid,partially_paid,overdue", limit: 50 }), enabled: !!creditNote?.customerId?._id && isApplyOpen });
  const openInvoices = invoicesData?.data || [];
  const selectedInvoice = openInvoices.find((invoice) => invoice._id === selectedInvoiceId);
  const maxApply = Math.min(creditNote?.remainingAmount || 0, selectedInvoice?.balanceDue || 0);
  if (isLoading || !creditNote) return <div className="py-16 text-center text-gray-500">Loading...</div>;
  const apply = async () => { if (+applyAmount > maxApply) { toast.error(`Cannot apply more than ${maxApply}`); return; } await applyMutation.mutateAsync({ id: creditNote._id, data: { invoiceId: selectedInvoiceId, amount: +applyAmount } }); setIsApplyOpen(false); setSelectedInvoiceId(""); setApplyAmount(0); };
  return <div><PageHeader title={<>Credit Note {creditNote.creditNoteNumber} <Badge>{creditNote.status.replace(/_/g, " ")}</Badge></>} description={`Customer: ${creditNote.customerSnapshot?.name} · ${date(creditNote.issueDate)}`} actions={<div className="flex gap-2"><Button variant="outline" onClick={() => router.push("/credit-notes")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>{creditNote.remainingAmount > 0 && creditNote.status !== "cancelled" && <Button variant="primary" onClick={() => setIsApplyOpen(true)}>Apply to Invoice</Button>}</div>} /><div className="grid grid-cols-3 gap-6"><div className="col-span-2 space-y-6"><Card className="p-6"><h3 className="mb-3 text-sm font-semibold">Details</h3><p className="mb-2 text-sm"><span className="text-gray-500">Reason:</span> {creditNote.reason.replace(/_/g, " ")}</p>{creditNote.description && <p className="mb-2 text-sm"><span className="text-gray-500">Description:</span> {creditNote.description}</p>}{creditNote.customerReturnId && <p className="text-sm"><span className="text-gray-500">From Return:</span> <button onClick={() => router.push(`/returns/${creditNote.customerReturnId._id}`)} className="text-primary-600 underline">{creditNote.customerReturnId.rmaNumber}</button></p>}</Card><Card><div className="border-b px-6 py-4"><h3 className="text-sm font-semibold">Applications</h3></div>{creditNote.applications?.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">Not yet applied to any invoice</p> : <table className="w-full"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Invoice</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th></tr></thead><tbody className="divide-y">{creditNote.applications.map((application, index) => <tr key={index}><td className="px-4 py-3"><button onClick={() => router.push(`/invoices/${application.invoiceId._id || application.invoiceId}`)} className="font-mono text-xs text-primary-600 underline">{application.invoiceNumber}</button></td><td className="px-4 py-3 text-sm">{date(application.appliedAt)}</td><td className="px-4 py-3 text-right text-sm font-medium">{money(application.amountApplied)}</td></tr>)}</tbody></table>}</Card></div><div><Card className="p-6"><h3 className="mb-4 text-sm font-semibold">Balance</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Original</span><span>{money(creditNote.amount)}</span></div><div className="flex justify-between"><span className="text-gray-600">Applied</span><span>{money(creditNote.amount - creditNote.remainingAmount)}</span></div><div className="flex justify-between border-t pt-3 font-bold"><span>Remaining</span><span className="text-primary-600">{money(creditNote.remainingAmount)}</span></div></div></Card></div></div><Modal isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} title="Apply Credit Note" size="md"><div className="space-y-4 p-6"><Select label="Invoice" required placeholder="Select open invoice..." options={openInvoices.map((invoice) => ({ value: invoice._id, label: `${invoice.invoiceNumber} — ${money(invoice.balanceDue)} due` }))} value={selectedInvoiceId} onChange={(event) => { setSelectedInvoiceId(event.target.value); setApplyAmount(Math.min(creditNote.remainingAmount, openInvoices.find((invoice) => invoice._id === event.target.value)?.balanceDue || 0)); }} />{selectedInvoice && <><Input label={`Amount (max ${money(maxApply)})`} type="number" step="0.01" min="0.01" max={maxApply} value={applyAmount} onChange={(event) => setApplyAmount(event.target.value)} /><p className="text-xs text-gray-500">Invoice balance: {money(selectedInvoice.balanceDue)} · Credit remaining: {money(creditNote.remainingAmount)}</p></>}</div><div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4"><Button variant="outline" onClick={() => setIsApplyOpen(false)}>Cancel</Button><Button variant="primary" onClick={apply} loading={applyMutation.isPending} disabled={!selectedInvoiceId || +applyAmount <= 0}>Apply</Button></div></Modal></div>;
}

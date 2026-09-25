"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, ClipboardCheck, FileText, Package, XCircle } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Badge from "../../../../components/ui/Badge.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import Modal from "../../../../components/ui/Modal.jsx";
import { useReturn, useReturnActions } from "../../../../client/features/returns/useReturns.js";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";

const statusVariant = { draft: "default", approved: "info", awaiting_return: "info", received: "warning", inspecting: "warning", processed: "warning", completed: "success", rejected: "danger", cancelled: "default" };
const dispositionOptions = [
  { value: "pending", label: "Pending decision" },
  { value: "restock", label: "Restock (good condition)" },
  { value: "repair", label: "Send to repair" },
  { value: "scrap", label: "Scrap (damaged)" },
  { value: "return_to_supplier", label: "Return to supplier" },
  { value: "refund_only_no_return", label: "Refund only (no physical return)" },
];
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const date = (value) => value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function ReturnDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, isLoading } = useReturn(id);
  const actions = useReturnActions();
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const [actionDialog, setActionDialog] = useState(null);
  const [reason, setReason] = useState("");
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [processItems, setProcessItems] = useState([]);
  const ret = data?.data;
  const warehouseOptions = (warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }));

  if (isLoading || !ret) return <div className="py-16 text-center text-gray-500">Loading...</div>;

  const openProcess = () => {
    setProcessItems(ret.items.map((item) => ({
      itemId: item._id,
      productName: item.productName,
      quantityReturned: item.quantityReturned,
      condition: item.condition || "pending_inspection",
      disposition: item.disposition || "pending",
      inspectionNotes: item.inspectionNotes || "",
      refundAmount: item.refundAmount,
      refundable: item.refundable,
    })));
    setIsProcessOpen(true);
  };
  const updateProcessItem = (index, field, value) => {
    setProcessItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };
  const handleApprove = async () => { await actions.approve.mutateAsync(ret._id); setActionDialog(null); };
  const handleReject = async () => { await actions.reject.mutateAsync({ id: ret._id, reason }); setActionDialog(null); setReason(""); };
  const handleReceive = async () => { if (!warehouseId) return; await actions.receive.mutateAsync({ id: ret._id, data: { warehouseId } }); setIsReceiveOpen(false); };
  const handleProcess = async () => { await actions.process.mutateAsync({ id: ret._id, data: { items: processItems.map((item) => ({ itemId: item.itemId, condition: item.condition, disposition: item.disposition, inspectionNotes: item.inspectionNotes, refundAmount: +item.refundAmount, refundable: item.refundable })) } }); setIsProcessOpen(false); };
  const handleIssueCreditNote = async () => { await actions.issueCreditNote.mutateAsync(ret._id); setActionDialog(null); };

  return <div>
    <PageHeader title={<span className="flex items-center gap-3">RMA {ret.rmaNumber}<Badge variant={statusVariant[ret.status]}>{ret.status.replace(/_/g, " ")}</Badge></span>} description={`Customer: ${ret.customerSnapshot?.name}`} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => router.push("/returns")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>{ret.status === "draft" && <><Button variant="primary" onClick={() => setActionDialog("approve")}><CheckCircle size={16} className="mr-1.5" /> Approve</Button><Button variant="danger" onClick={() => setActionDialog("reject")}><XCircle size={16} className="mr-1.5" /> Reject</Button></>}{ret.status === "approved" && <Button variant="primary" onClick={() => setIsReceiveOpen(true)}><Package size={16} className="mr-1.5" /> Mark Received</Button>}{ret.status === "received" && <Button variant="primary" onClick={openProcess}><ClipboardCheck size={16} className="mr-1.5" /> Process & Inspect</Button>}{ret.status === "processed" && !ret.creditNoteId && <Button variant="primary" onClick={() => setActionDialog("creditNote")}><FileText size={16} className="mr-1.5" /> Issue Credit Note</Button>}</div>} />
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6"><Card><div className="border-b px-6 py-4"><h3 className="text-sm font-semibold">Items</h3></div><table className="w-full"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Reason</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Disposition</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Refund</th></tr></thead><tbody className="divide-y">{ret.items.map((item) => <tr key={item._id}><td className="px-4 py-3"><p className="text-sm font-medium">{item.productName}</p><p className="font-mono text-xs text-gray-500">{item.productCode}</p></td><td className="px-4 py-3 text-right text-sm">{item.quantityReturned}</td><td className="px-4 py-3 text-sm">{item.reason.replace(/_/g, " ")}</td><td className="px-4 py-3 text-sm"><Badge>{item.disposition?.replace(/_/g, " ")}</Badge></td><td className="px-4 py-3 text-right text-sm">{money(item.refundAmount)}</td></tr>)}</tbody></table></Card>{ret.customerNotes && <Card className="p-6"><h3 className="mb-2 text-sm font-semibold">Customer Notes</h3><p className="text-sm">{ret.customerNotes}</p></Card>}</div>
      <div className="space-y-6"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold">Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Return Value</span><span>{money(ret.totalReturnValue)}</span></div><div className="flex justify-between"><span className="text-gray-600">Restocking Fees</span><span className="text-red-600">-{money(ret.totalRestockingFees)}</span></div><div className="flex justify-between border-t pt-3 font-bold"><span>Net Refund</span><span className="text-primary-600">{money(ret.netRefundAmount)}</span></div></div></Card><Card className="p-6"><h3 className="mb-4 text-sm font-semibold">Timeline</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Requested</span><span>{date(ret.requestDate)}</span></div>{ret.approvedAt && <div className="flex justify-between"><span className="text-gray-500">Approved</span><span>{date(ret.approvedAt)}</span></div>}{ret.receivedDate && <div className="flex justify-between"><span className="text-gray-500">Received</span><span>{date(ret.receivedDate)}</span></div>}{ret.completedDate && <div className="flex justify-between"><span className="text-gray-500">Completed</span><span>{date(ret.completedDate)}</span></div>}</div></Card>{ret.creditNoteId && <Card className="border-green-200 bg-green-50 p-6"><h3 className="text-sm font-semibold text-green-800">Credit Note Issued</h3><p className="mt-1 text-sm"><button onClick={() => router.push(`/credit-notes/${ret.creditNoteId._id}`)} className="text-green-700 underline">{ret.creditNoteId.creditNoteNumber}</button></p><p className="text-sm text-green-700">{money(ret.creditNoteId.amount)}</p></Card>}{ret.rejectionReason && <Card className="border-red-200 bg-red-50 p-6"><h3 className="text-sm font-semibold text-red-800">Rejected</h3><p className="mt-1 text-sm text-red-700">{ret.rejectionReason}</p></Card>}</div>
    </div>
    <ConfirmDialog isOpen={actionDialog === "approve"} onClose={() => setActionDialog(null)} onConfirm={handleApprove} title="Approve Return" message="Approve this return request?" loading={actions.approve.isPending} />
    <ConfirmDialog isOpen={actionDialog === "reject"} onClose={() => { setActionDialog(null); setReason(""); }} onConfirm={handleReject} title="Reject Return" message={<div><p className="mb-3">Rejection reason:</p><textarea rows={3} className="w-full rounded border px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} /></div>} variant="danger" loading={actions.reject.isPending} />
    <ConfirmDialog isOpen={actionDialog === "creditNote"} onClose={() => setActionDialog(null)} onConfirm={handleIssueCreditNote} title="Issue Credit Note" message={`Issue a credit note for ${money(ret.netRefundAmount)}? This closes the return.`} loading={actions.issueCreditNote.isPending} />
    <Modal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} title="Receive Returned Goods" size="md"><div className="space-y-4 p-6"><p className="text-sm text-gray-600">Where are the returned items being stored?</p><Select label="Warehouse" required options={warehouseOptions} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} /></div><div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4"><Button variant="outline" onClick={() => setIsReceiveOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleReceive} loading={actions.receive.isPending} disabled={!warehouseId}>Mark Received</Button></div></Modal>
    <Modal isOpen={isProcessOpen} onClose={() => setIsProcessOpen(false)} title="Process & Inspect Returned Items" size="xl"><div className="space-y-3 p-6"><p className="rounded bg-blue-50 p-3 text-sm text-blue-900">Assign a disposition for each item. Restock will add it back to stock. Scrap creates a damage record. Repair creates a repair order.</p>{processItems.map((item, index) => <div key={index} className="rounded-lg border p-3"><p className="mb-2 text-sm font-medium">{item.productName} — qty {item.quantityReturned}</p><div className="grid grid-cols-2 gap-3"><Select label="Condition" options={[{ value: "pending_inspection", label: "Pending inspection" }, { value: "resellable", label: "Resellable" }, { value: "repairable", label: "Repairable" }, { value: "damaged", label: "Damaged" }, { value: "expired", label: "Expired" }, { value: "missing", label: "Missing" }]} value={item.condition} onChange={(event) => updateProcessItem(index, "condition", event.target.value)} /><Select label="Disposition" options={dispositionOptions} value={item.disposition} onChange={(event) => updateProcessItem(index, "disposition", event.target.value)} /></div><div className="mt-2 grid grid-cols-2 gap-3"><Input label="Refund amount (LKR)" type="number" step="0.01" min="0" value={item.refundAmount} onChange={(event) => updateProcessItem(index, "refundAmount", event.target.value)} /><div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.refundable} onChange={(event) => updateProcessItem(index, "refundable", event.target.checked)} /> Refundable</label></div></div><Textarea label="Inspection notes" rows={2} value={item.inspectionNotes} onChange={(event) => updateProcessItem(index, "inspectionNotes", event.target.value)} /></div>)}</div><div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4"><Button variant="outline" onClick={() => setIsProcessOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleProcess} loading={actions.process.isPending}>Process Return</Button></div></Modal>
  </div>;
}

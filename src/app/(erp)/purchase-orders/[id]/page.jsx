"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle, PackageCheck, Send } from "lucide-react";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import PurchaseOrderGrnModal from "../../../../client/features/grns/PurchaseOrderGrnModal.jsx";
import { useAuthStore } from "../../../../client/store/authStore.js";
import { useChangePoStatus, usePurchaseOrder } from "../../../../client/features/purchaseOrders/usePurchaseOrders.js";

const variants = { draft: "default", pending_approval: "warning", approved: "info", sent: "info", partially_received: "warning", fully_received: "success", closed: "success", cancelled: "danger" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const date = (value) => value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [isGrnOpen, setIsGrnOpen] = useState(false);
  const { data, isLoading } = usePurchaseOrder(id);
  const changeStatus = useChangePoStatus();
  const po = data?.data;

  if (isLoading || !po) return <div className="py-16 text-center text-gray-500">Loading...</div>;

  const canApprove = ["admin", "manager", "accountant"].includes(user?.role);
  const canReceive = ["admin", "manager", "warehouse_staff"].includes(user?.role);
  const actions = [];
  if (["draft", "pending_approval"].includes(po.status) && canApprove) actions.push({ label: "Approve", icon: CheckCircle, variant: "primary", status: "approved" });
  if (po.status === "approved" && canApprove) actions.push({ label: "Mark Sent", icon: Send, variant: "primary", status: "sent" });
  if (["approved", "sent", "partially_received"].includes(po.status) && canReceive) actions.push({ label: "Receive Goods", icon: PackageCheck, variant: "primary", onClick: () => setIsGrnOpen(true) });
  if (["partially_received", "fully_received"].includes(po.status) && canApprove) actions.push({ label: "Close PO", icon: CheckCircle, variant: "outline", status: "closed" });
  if (!["closed", "cancelled", "fully_received"].includes(po.status) && canApprove) actions.push({ label: "Cancel", icon: Ban, variant: "danger", status: "cancelled", needsReason: true });
  const submit = async () => { await changeStatus.mutateAsync({ id: po._id, status: action.status, reason }); setAction(null); setReason(""); };

  return <div>
    <PageHeader title={<span className="flex items-center gap-3">PO {po.poNumber}<Badge variant={variants[po.status]}>{po.status.replace("_", " ")}</Badge></span>} description={`Created ${date(po.createdAt)}`} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => router.push("/purchase-orders")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>{actions.map((item) => <Button key={item.label} variant={item.variant} onClick={item.onClick || (() => setAction(item))}><item.icon size={16} className="mr-1.5" /> {item.label}</Button>)}</div>} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Supplier & Delivery</h3><div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><div><p className="mb-1 text-xs uppercase text-gray-500">Supplier</p><p className="font-medium">{po.supplierSnapshot?.name}</p><p className="text-sm text-gray-600">{po.supplierSnapshot?.code}</p>{po.supplierSnapshot?.taxRegistrationNumber && <p className="text-sm text-gray-600">VAT: {po.supplierSnapshot.taxRegistrationNumber}</p>}</div><div><p className="mb-1 text-xs uppercase text-gray-500">Deliver To</p><p className="font-medium">{po.deliverTo?.warehouseName}</p>{po.deliverTo?.address?.line1 && <p className="mt-1 text-sm text-gray-600">{po.deliverTo.address.line1}{po.deliverTo.address.city && `, ${po.deliverTo.address.city}`}</p>}{po.expectedDeliveryDate && <p className="mt-2 text-sm text-gray-600">Expected: <span className="font-medium">{date(po.expectedDeliveryDate)}</span></p>}</div></div></Card><Card><div className="flex items-center justify-between border-b px-6 py-4"><h3 className="text-sm font-semibold text-gray-700">Items</h3><span className="text-xs text-gray-500">Receipt: <strong>{Math.round(po.receiptCompletionPercent || 0)}%</strong></span></div><table className="w-full"><thead className="border-b bg-gray-50"><tr>{["Product", "Ordered", "Received", "Pending", "Price", "Total", "Status"].map((label) => <th key={label} className="px-4 py-2 text-left text-xs font-semibold text-gray-600">{label}</th>)}</tr></thead><tbody className="divide-y">{po.items.map((item) => <tr key={item._id || item.lineNumber}><td className="px-4 py-3"><p className="text-sm font-medium">{item.productName}</p><p className="font-mono text-xs text-gray-500">{item.productCode}</p></td><td className="px-4 py-3 text-sm">{item.orderedQuantity} {item.unitOfMeasure}</td><td className="px-4 py-3 text-sm">{item.receivedQuantity || 0}</td><td className="px-4 py-3 text-sm">{item.pendingQuantity}</td><td className="px-4 py-3 text-sm">{money(item.unitPrice)}</td><td className="px-4 py-3 text-sm font-medium">{money(item.lineTotal)}</td><td className="px-4 py-3"><Badge variant={item.lineStatus === "fully_received" ? "success" : item.lineStatus === "partially_received" ? "warning" : "default"}>{item.lineStatus?.replace("_", " ")}</Badge></td></tr>)}</tbody></table></Card>{po.notes && <Card className="p-6"><h3 className="mb-2 text-sm font-semibold text-gray-700">Notes</h3><p className="whitespace-pre-wrap text-sm">{po.notes}</p></Card>}</div><div className="space-y-6"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(po.subtotal)}</span></div>{po.totalDiscount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{money(po.totalDiscount)}</span></div>}<div className="flex justify-between"><span>Tax</span><span>{money(po.totalTax)}</span></div>{po.shippingCost > 0 && <div className="flex justify-between"><span>Shipping</span><span>{money(po.shippingCost)}</span></div>}{po.otherCharges > 0 && <div className="flex justify-between"><span>Other</span><span>{money(po.otherCharges)}</span></div>}<div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Total</span><span className="text-primary-600">{money(po.grandTotal)}</span></div></div></Card><Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Details</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>PO Date</span><span>{date(po.poDate)}</span></div><div className="flex justify-between"><span>Payment</span><span className="uppercase">{po.paymentTerms?.type}</span></div>{po.paymentTerms?.dueDate && <div className="flex justify-between"><span>Due Date</span><span>{date(po.paymentTerms.dueDate)}</span></div>}{po.shippingTerms && <div className="flex justify-between"><span>Shipping</span><span>{po.shippingTerms}</span></div>}</div></Card></div></div><ConfirmDialog isOpen={!!action} onClose={() => { setAction(null); setReason(""); }} onConfirm={submit} title={action?.label} message={action?.needsReason ? <div><p className="mb-3">Please provide a reason:</p><textarea rows={3} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} /></div> : `${action?.label} this purchase order?`} confirmText={action?.label} variant={action?.variant === "danger" ? "danger" : "primary"} loading={changeStatus.isPending} />
    <PurchaseOrderGrnModal isOpen={isGrnOpen} onClose={() => setIsGrnOpen(false)} purchaseOrder={po} />
  </div>;
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../client/api/axios.js";
import { useBill } from "../../../../client/features/bills/useBills.js";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";

const statusVariant = { unpaid: "warning", partially_paid: "info", paid: "success", overdue: "danger", cancelled: "default", disputed: "danger" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const date = (value) => value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { data, isLoading } = useBill(id);
  const bill = data?.data;

  // Payments deliberately remain an external dependency. This is the original
  // request shape, not a replacement Payments API or fabricated history.
  const { data: paymentsData } = useQuery({
    queryKey: ["paymentsForBill", id],
    queryFn: async () => (await api.get("/payments", { params: { documentId: id, limit: 50 } })).data,
    enabled: !!id,
  });
  const payments = paymentsData?.data || [];

  if (isLoading || !bill) return <div className="py-16 text-center text-gray-500">Loading...</div>;

  return <div>
    <PageHeader title={<span className="flex items-center gap-3">Bill {bill.billNumber}<Badge variant={statusVariant[bill.paymentStatus]}>{bill.paymentStatus.replace("_", " ")}</Badge>{bill.daysPastDue > 0 && <Badge variant="danger">{bill.daysPastDue}d late</Badge>}</span>} description={`${date(bill.billDate)} · Due ${date(bill.dueDate)}`} actions={<div className="flex gap-2"><Button variant="outline" onClick={() => router.push("/bills")}><ArrowLeft size={16} className="mr-1.5" /> Back</Button>{bill.balanceDue > 0 && <Button variant="primary" onClick={() => router.push(`/payments/new?billId=${bill._id}`)}><Receipt size={16} className="mr-1.5" /> Record Payment</Button>}</div>} />
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Supplier</h3><div className="grid grid-cols-2 gap-6"><div><p className="mb-1 text-xs uppercase text-gray-500">Vendor</p><p className="font-medium">{bill.supplierSnapshot?.name}</p><p className="text-sm text-gray-600">{bill.supplierSnapshot?.code}</p>{bill.supplierSnapshot?.taxRegistrationNumber && <p className="text-sm text-gray-600">VAT: {bill.supplierSnapshot.taxRegistrationNumber}</p>}</div><div>{bill.supplierInvoiceNumber && <><p className="mb-1 text-xs uppercase text-gray-500">Supplier Invoice #</p><p className="font-mono text-sm">{bill.supplierInvoiceNumber}</p></>}{bill.grnNumbers?.length > 0 && <><p className="mb-1 mt-3 text-xs uppercase text-gray-500">Related GRNs</p><div className="text-sm">{bill.grnNumbers.map((number) => <span key={number} className="mr-2 font-mono">{number}</span>)}</div></>}{bill.purchaseOrderNumbers?.length > 0 && <><p className="mb-1 mt-3 text-xs uppercase text-gray-500">Related POs</p><div className="text-sm">{bill.purchaseOrderNumbers.map((number) => <span key={number} className="mr-2 font-mono">{number}</span>)}</div></>}</div></div></Card>
        <Card><div className="border-b px-6 py-4"><h3 className="text-sm font-semibold text-gray-700">Items</h3></div><table className="w-full"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Price</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th></tr></thead><tbody className="divide-y">{bill.items.map((item) => <tr key={item._id || item.lineNumber}><td className="px-4 py-3"><p className="text-sm font-medium">{item.productName}</p>{item.productCode && <p className="font-mono text-xs text-gray-500">{item.productCode}</p>}</td><td className="px-4 py-3 text-right text-sm">{item.quantity}</td><td className="px-4 py-3 text-right text-sm">{money(item.unitPrice)}</td><td className="px-4 py-3 text-right text-sm font-medium">{money(item.lineTotal)}</td></tr>)}</tbody></table></Card>
        {payments.length > 0 && <Card><div className="flex items-center justify-between border-b px-6 py-4"><h3 className="text-sm font-semibold text-gray-700">Payment History</h3><Badge variant="success">{payments.length} Payments</Badge></div><table className="w-full"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Method</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Ref #</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th></tr></thead><tbody className="divide-y">{payments.map((payment) => <tr key={payment._id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/payments/${payment._id}`)}><td className="px-4 py-3 text-sm">{date(payment.paymentDate)}</td><td className="px-4 py-3 text-sm capitalize">{payment.method.replace("_", " ")}</td><td className="px-4 py-3 font-mono text-sm">{payment.paymentNumber}</td><td className="px-4 py-3 text-right text-sm font-medium text-green-600">{money(payment.amount)}</td></tr>)}</tbody></table></Card>}
      </div>
      <div className="space-y-6"><Card className="p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{money(bill.subtotal)}</span></div>{bill.totalDiscount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-green-600">-{money(bill.totalDiscount)}</span></div>}<div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{money(bill.totalTax)}</span></div>{bill.shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{money(bill.shippingCost)}</span></div>}<div className="flex justify-between border-t pt-3"><span className="font-semibold">Total</span><span className="font-bold">{money(bill.grandTotal)}</span></div><div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="text-green-600">-{money(bill.amountPaid)}</span></div><div className="flex justify-between border-t pt-2"><span className="font-semibold">Balance Due</span><span className={`text-lg font-bold ${bill.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>{money(bill.balanceDue)}</span></div></div></Card></div>
    </div>
  </div>;
}

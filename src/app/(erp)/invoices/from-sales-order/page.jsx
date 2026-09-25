"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination */
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "lucide-react";
import { salesOrdersApi } from "../../../../client/features/salesOrders/salesOrdersApi.js";
import { useGenerateFromSO } from "../../../../client/features/invoices/useInvoices.js";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import EmptyState from "../../../../components/ui/EmptyState.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
export default function InvoiceFromSalesOrderPage() {
  const params = useSearchParams(); const [selectedIds, setSelectedIds] = useState(() => params.get("orderIds")?.split(",") || []); const [notes, setNotes] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["salesOrders", "ready-to-invoice"], queryFn: () => salesOrdersApi.list({ status: "delivered", limit: 200 }) }); const mutation = useGenerateFromSO(); const orders = data?.data || [];
  const selected = orders.filter((order) => selectedIds.includes(order._id)); const customerId = selected[0]?.customerId?._id; const allSameCustomer = selected.every((order) => order.customerId?._id === customerId); const total = selected.reduce((sum, order) => sum + (order.grandTotal || 0), 0);
  const toggle = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const submit = async () => { if (!selectedIds.length) return toast.error("Select at least one order"); if (!allSameCustomer) return toast.error("All selected orders must be from the same customer"); try { const result = await mutation.mutateAsync({ salesOrderIds: selectedIds, notes: notes || undefined }); window.location.assign(`/invoices/${result.data._id}`); } catch {} };
  return <div><PageHeader title="Generate Invoice from Sales Orders" description="Select delivered orders to invoice (must be from the same customer)" actions={<Link href="/invoices"><Button variant="outline"><ArrowLeft size={16} className="mr-1.5" />Back</Button></Link>} /><div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="lg:col-span-2"><Card>{isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : orders.length === 0 ? <EmptyState title="No delivered orders" description="Orders must be in 'delivered' status to be invoiced" /> : <table className="w-full"><thead className="border-b bg-gray-50"><tr>{["", "Order #", "Date", "Customer", "Total"].map((label) => <th key={label} className="px-4 py-2 text-left text-xs font-semibold">{label}</th>)}</tr></thead><tbody>{orders.map((order) => { const disabled = customerId && order.customerId?._id !== customerId; return <tr key={order._id} className={`border-t ${disabled ? "opacity-40" : ""}`}><td className="px-4 py-2"><input type="checkbox" checked={selectedIds.includes(order._id)} disabled={disabled} onChange={() => !disabled && toggle(order._id)} /></td><td className="px-4 py-2 font-mono text-xs">{order.orderNumber}</td><td className="px-4 py-2 text-sm">{new Date(order.orderDate).toLocaleDateString("en-LK")}</td><td className="px-4 py-2"><p className="text-sm font-medium">{order.customerSnapshot?.name}</p><p className="text-xs text-gray-500">{order.customerSnapshot?.code}</p></td><td className="px-4 py-2 text-right text-sm font-medium">{money(order.grandTotal)}</td></tr>; })}</tbody></table>}</Card></div><Card className="h-fit p-6"><h3 className="mb-4 text-sm font-semibold">Invoice Details</h3><div className="mb-4 space-y-3 text-sm"><p className="flex justify-between"><span>Orders selected</span><span>{selectedIds.length}</span></p>{selected.length > 0 && <p className="flex justify-between"><span>Customer</span><span>{selected[0].customerSnapshot?.name}</span></p>}{!allSameCustomer && selected.length > 0 && <Badge variant="danger">Multiple customers selected</Badge>}<p className="flex justify-between border-t pt-3 font-bold"><span>Total</span><span className="text-primary-600">{money(total)}</span></p></div><Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /><Button variant="primary" fullWidth className="mt-4" onClick={submit} loading={mutation.isPending} disabled={!selectedIds.length || !allSameCustomer}><Save size={16} className="mr-1.5" />Generate Invoice</Button></Card></div></div>;
}

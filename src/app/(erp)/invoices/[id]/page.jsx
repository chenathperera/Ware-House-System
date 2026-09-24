"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, Printer, Send } from "lucide-react";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import {
  useChangeInvoiceStatus,
  useInvoice,
} from "../../../../client/features/invoices/useInvoices.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value || 0);

const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useInvoice(id);
  const changeStatus = useChangeInvoiceStatus();
  const invoice = data?.data;

  const updateStatus = async (status) => {
    const reason =
      status === "cancelled"
        ? window.prompt("Cancellation reason")
        : undefined;
    if (status === "cancelled" && reason === null) {
      return;
    }

    await changeStatus.mutateAsync({ id, status, reason });
  };

  if (isLoading) {
    return <div className="py-16 text-center text-gray-500">Loading...</div>;
  }

  if (!invoice) {
    return (
      <div className="py-16 text-center text-gray-500">Invoice not found</div>
    );
  }

  const canSend = invoice.status === "approved";
  const canCancel = ["approved", "sent"].includes(invoice.status) && invoice.paymentStatus !== "paid";

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={`${date(invoice.invoiceDate)} · ${invoice.invoiceType}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/invoices">
              <Button variant="outline">
                <ArrowLeft size={16} className="mr-1.5" />
                Back
              </Button>
            </Link>
            <Link href={`/receipt/${invoice._id}`}>
              <Button variant="outline">
                <Printer size={16} className="mr-1.5" />
                Print
              </Button>
            </Link>
            {canSend && (
              <Button
                variant="primary"
                loading={changeStatus.isPending}
                onClick={() => updateStatus("sent")}
              >
                <Send size={16} className="mr-1.5" />
                Mark Sent
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                loading={changeStatus.isPending}
                onClick={() => updateStatus("cancelled")}
              >
                <Ban size={16} className="mr-1.5" />
                Cancel
              </Button>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-gray-500">Customer</p>
                <p className="font-medium">{invoice.customerSnapshot?.name}</p>
                <p className="text-sm text-gray-600">{invoice.customerSnapshot?.code}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Due Date</p>
                <p>{date(invoice.dueDate)}</p>
                <Badge className="mt-2">{invoice.paymentStatus}</Badge>{" "}
                <Badge variant="info">{invoice.status}</Badge>
              </div>
            </div>
          </Card>
          <Card className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Tax</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-3">
                      <p>{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {item.productCode} · {item.unitOfMeasure}
                      </p>
                    </td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">{money(item.unitPrice)}</td>
                    <td className="p-3 text-right">{money(item.lineDiscount)}</td>
                    <td className="p-3 text-right">{money(item.lineTax)}</td>
                    <td className="p-3 text-right">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {(invoice.notes || invoice.paymentInstructions) && (
            <Card className="space-y-4 p-6">
              {invoice.notes && (
                <div>
                  <h3 className="font-semibold">Notes</h3>
                  <p>{invoice.notes}</p>
                </div>
              )}
              {invoice.paymentInstructions && (
                <div>
                  <h3 className="font-semibold">Payment Instructions</h3>
                  <p>{invoice.paymentInstructions}</p>
                </div>
              )}
            </Card>
          )}
        </div>
        <Card className="h-fit space-y-2 p-6">
          <h3 className="mb-4 font-semibold">Summary</h3>
          <Summary label="Subtotal" value={invoice.subtotal} />
          <Summary
            label="Discount"
            value={invoice.totalDiscount + (invoice.orderDiscount?.amount || 0)}
          />
          <Summary label="Tax" value={invoice.totalTax} />
          <Summary label="Shipping" value={invoice.shippingCost} />
          <Summary label="Other Charges" value={invoice.otherCharges} />
          <Summary label="Grand Total" value={invoice.grandTotal} strong />
          <Summary label="Amount Paid" value={invoice.amountPaid} />
          <Summary label="Balance Due" value={invoice.balanceDue} strong />
        </Card>
      </div>
    </div>
  );
}

function Summary({ label, value, strong = false }) {
  const className = `flex justify-between ${
    strong ? "border-t pt-2 font-bold" : ""
  }`;

  return (
    <div className={className}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useInvoice } from "../../../client/features/invoices/useInvoices.js";
import { useCompanySettings } from "../../../client/features/settings/useSettings.js";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

function ReceiptRow({ label, value, strong = false }) {
  return (
    <div
      className={`flex justify-between ${strong ? "border-t border-black pt-1 text-lg font-black" : ""}`}
    >
      <span>{label}</span>
      <span>{formatNumber(value)}</span>
    </div>
  );
}

export default function ReceiptPrintPage() {
  const { id } = useParams();
  const { data, isLoading } = useInvoice(id);
  const { data: settingsData } = useCompanySettings();
  const invoice = data?.data;
  const settings = settingsData?.data || {};

  useEffect(() => {
    if (!invoice) return undefined;

    const timer = setTimeout(() => {
      window.print();
    }, 600);

    return () => clearTimeout(timer);
  }, [invoice]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading receipt...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen items-center justify-center">
        Invoice not found
      </div>
    );
  }

  const customer = invoice.customerSnapshot || {};
  const discount =
    (invoice.totalDiscount || 0) + (invoice.orderDiscount?.amount || 0);
  const footer =
    settings.receiptFooterMessage ||
    "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.";

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          .no-print { display: none !important; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
      `}</style>

      <div className="no-print fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b bg-white p-3">
        <Link
          href={`/invoices/${invoice._id}`}
          className="rounded px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          View Invoice
        </Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer size={16} />
          Print Receipt
        </button>
      </div>

      <main className="mx-auto mt-16 w-[80mm] bg-white p-3 font-mono text-[13px] text-black">
        <header className="mb-3 text-center">
          <h1 className="text-[17px] font-black uppercase">
            {settings.companyName || "YOUR COMPANY NAME"}
          </h1>
          {settings.address && <p>{settings.address}</p>}
          {settings.phone && <p>TEL: {settings.phone}</p>}
          {settings.taxRegistrationNumber && (
            <p>VAT NO: {settings.taxRegistrationNumber}</p>
          )}
        </header>

        <hr className="border-black" />

        <div className="my-2 text-xs">
          <p>Receipt No: <strong>{invoice.invoiceNumber}</strong></p>
          <p>Date: {new Date(invoice.invoiceDate).toLocaleString("en-LK")}</p>
          {customer.name && <p>Customer: <strong>{customer.name}</strong></p>}
          {customer.phone && <p>Contact: {customer.phone}</p>}
        </div>

        <hr className="border-black" />

        <div className="my-2 flex justify-between text-[10px] font-bold uppercase">
          <span>Description</span>
          <span>Amount</span>
        </div>

        {invoice.items.map((item) => (
          <section key={item._id} className="mb-2">
            <strong>{item.productName}</strong>
            <div className="flex justify-between">
              <span>
                {item.quantity} {item.unitOfMeasure} × {formatNumber(item.unitPrice)}
              </span>
              <strong>{formatNumber(item.lineTotal)}</strong>
            </div>
            {item.discountPercent > 0 && (
              <small>Discount: {item.discountPercent}%</small>
            )}
          </section>
        ))}

        <hr className="border-black" />

        <div className="space-y-1">
          <ReceiptRow label="Subtotal" value={invoice.subtotal} />
          {discount > 0 && <ReceiptRow label="Discount" value={-discount} />}
          {invoice.totalTax > 0 && <ReceiptRow label="Tax" value={invoice.totalTax} />}
          {invoice.shippingCost > 0 && (
            <ReceiptRow label="Shipping" value={invoice.shippingCost} />
          )}
          {invoice.otherCharges > 0 && (
            <ReceiptRow label="Other Charges" value={invoice.otherCharges} />
          )}
          <ReceiptRow label="TOTAL" value={invoice.grandTotal} strong />
          <ReceiptRow label="Paid Amount" value={invoice.amountPaid} />
          <ReceiptRow label="Amount Due" value={invoice.balanceDue} />
        </div>

        {(invoice.notes || invoice.paymentInstructions) && (
          <div className="mt-3 border-t pt-2">
            {invoice.notes && <p>{invoice.notes}</p>}
            {invoice.paymentInstructions && <p>{invoice.paymentInstructions}</p>}
          </div>
        )}

        <footer className="mt-4 border-t pt-2 text-center">
          {footer.split("\n").map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </footer>
      </main>
    </>
  );
}

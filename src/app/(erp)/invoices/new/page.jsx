"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Input from "../../../../components/ui/Input.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { customersApi } from "../../../../client/features/customers/customersApi.js";
import { productsApi } from "../../../../client/features/products/productsApi.js";
import { useCreateInvoice } from "../../../../client/features/invoices/useInvoices.js";

const initialItem = {
  productName: "",
  quantity: 1,
  unitPrice: 0,
};

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function NewInvoicePage() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState("");
  const [invoiceType, setInvoiceType] = useState("standard");
  const [notes, setNotes] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState([initialItem]);

  const { data: customersData } = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () => customersApi.list({ status: "active", limit: 500 }),
  });
  const { data: productsData } = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => productsApi.list({ status: "active", limit: 500 }),
  });

  const customers = customersData?.data || [];
  const products = productsData?.data || [];
  const customerOptions = customers.map((customer) => ({
    value: customer._id,
    label: `${customer.displayName} (${customer.customerCode})`,
  }));
  const productOptions = products.map((product) => ({
    value: product._id,
    label: `${product.name} — ${product.productCode}`,
  }));

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + (+item.quantity || 0) * (+item.unitPrice || 0),
      0,
    );
    const discountAmount =
      discountType === "percentage"
        ? (subtotal * (+discountValue || 0)) / 100
        : +discountValue || 0;
    return {
      subtotal: +subtotal.toFixed(2),
      discountAmount: +discountAmount.toFixed(2),
      grand: +(subtotal - discountAmount + (+shippingCost || 0)).toFixed(2),
    };
  }, [items, shippingCost, discountType, discountValue]);

  const addItem = () => setItems((current) => [...current, initialItem]);
  const removeItem = (index) =>
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "productId" && value) {
          const product = products.find((candidate) => candidate._id === value);
          if (product) {
            next.productName = product.name;
            next.productCode = product.productCode;
            next.unitPrice = product.basePrice;
            next.unitOfMeasure = product.unitOfMeasure;
          }
        }
        return next;
      }),
    );
  };
  const submit = async () => {
    if (!customerId) return toast.error("Select customer");
    if (items.length === 0 || items.some((item) => !item.productName || !item.quantity)) {
      return toast.error("All items need a name and quantity");
    }
    try {
      const result = await createInvoice.mutateAsync({
        customerId,
        invoiceType,
        invoiceDate,
        dueDate: dueDate || undefined,
        items: items.map((item) => ({
          productId: item.productId || undefined,
          productCode: item.productCode || undefined,
          productName: item.productName,
          quantity: +item.quantity,
          unitOfMeasure: item.unitOfMeasure || undefined,
          unitPrice: +item.unitPrice,
        })),
        orderDiscount:
          discountValue > 0
            ? { type: discountType, value: +discountValue }
            : undefined,
        shippingCost: +shippingCost || 0,
        notes: notes || undefined,
        paymentInstructions: paymentInstructions || undefined,
        status: "approved",
      });
      router.push(`/invoices/${result.data._id}`);
    } catch {}
  };

  return (
    <div>
      <PageHeader
        title="Manual Invoice"
        description="Create an invoice without a sales order (services, miscellaneous)"
        actions={
          <Link href="/invoices">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4 p-6">
            <h3 className="text-sm font-semibold text-gray-700">Customer & Dates</h3>
            <Select label="Customer" required placeholder="Select customer..." options={customerOptions} value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
              <Input label="Due Date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              <Select label="Type" options={[{ value: "standard", label: "Standard" }, { value: "proforma", label: "Proforma" }, { value: "service", label: "Service" }]} value={invoiceType} onChange={(event) => setInvoiceType(event.target.value)} />
            </div>
          </Card>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-700">Line Items</h3><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" />Add Item</Button></div>
            <div className="space-y-3">{items.map((item, index) => <InvoiceLine key={index} item={item} index={index} productOptions={productOptions} onChange={updateItem} onRemove={removeItem} />)}</div>
          </Card>
          <Card className="space-y-4 p-6"><h3 className="text-sm font-semibold text-gray-700">Notes</h3><Textarea label="Invoice Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /><Textarea label="Payment Instructions" rows={2} value={paymentInstructions} onChange={(event) => setPaymentInstructions(event.target.value)} /></Card>
        </div>
        <InvoiceSummary totals={totals} discountType={discountType} discountValue={discountValue} shippingCost={shippingCost} onDiscountType={setDiscountType} onDiscountValue={setDiscountValue} onShipping={setShippingCost} onSubmit={submit} loading={createInvoice.isPending} disabled={!customerId || items.length === 0} />
      </div>
    </div>
  );
}

function InvoiceLine({ item, index, productOptions, onChange, onRemove }) {
  const lineTotal = (+item.quantity || 0) * (+item.unitPrice || 0);
  return <div className="rounded-lg border p-3"><div className="mb-2 flex gap-2"><span className="mt-2 w-6 text-xs text-gray-500">{index + 1}</span><div className="flex-1"><Select placeholder="Product (or type below for service)..." options={productOptions} value={item.productId || ""} onChange={(event) => onChange(index, "productId", event.target.value)} /></div><button type="button" onClick={() => onRemove(index)} className="mt-1 rounded p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button></div><Input label="Description / Name" required value={item.productName} onChange={(event) => onChange(index, "productName", event.target.value)} /><div className="mt-2 grid grid-cols-3 gap-2"><Input label="Qty" type="number" step="0.01" min="0.01" value={item.quantity} onChange={(event) => onChange(index, "quantity", event.target.value)} /><Input label="Unit Price" type="number" step="0.01" min="0" value={item.unitPrice} onChange={(event) => onChange(index, "unitPrice", event.target.value)} /><div><label className="mb-1 block text-sm font-medium text-gray-700">Total</label><p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium">{money(lineTotal)}</p></div></div></div>;
}

function InvoiceSummary({ totals, discountType, discountValue, shippingCost, onDiscountType, onDiscountValue, onShipping, onSubmit, loading, disabled }) {
  return <Card className="h-fit p-6"><h3 className="mb-4 text-sm font-semibold text-gray-700">Summary</h3><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{money(totals.subtotal)}</span></div><div className="flex items-center justify-between gap-2"><span className="text-gray-600">Discount</span><div className="flex items-center gap-1"><select value={discountType} onChange={(event) => onDiscountType(event.target.value)} className="rounded border px-1 py-1 text-xs"><option value="percentage">%</option><option value="fixed">Rs</option></select><input type="number" step="0.01" min="0" value={discountValue} onChange={(event) => onDiscountValue(event.target.value)} className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm" /></div></div>{totals.discountAmount > 0 && <div className="flex justify-between text-xs text-red-600"><span>Discount Amount</span><span>-{money(totals.discountAmount)}</span></div>}<div className="flex items-center justify-between gap-2"><span className="text-gray-600">Shipping</span><input type="number" step="0.01" min="0" value={shippingCost} onChange={(event) => onShipping(event.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm" /></div><div className="flex justify-between border-t pt-3 font-bold"><span>Total</span><span className="text-primary-600">{money(totals.grand)}</span></div></div><Button variant="primary" fullWidth className="mt-6" onClick={onSubmit} loading={loading} disabled={disabled}><Save size={16} className="mr-1.5" />Create Invoice</Button></Card>;
}

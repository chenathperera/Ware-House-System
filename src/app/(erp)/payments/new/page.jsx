"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { customersApi } from "../../../../client/features/customers/customersApi.js";
import { invoicesApi } from "../../../../client/features/invoices/invoicesApi.js";
import { useCreatePayment } from "../../../../client/features/payments/usePayments.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value || 0);

export default function NewPaymentPage() {
  const router = useRouter();
  const [direction, setDirection] = useState("received");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [method, setMethod] = useState("bank_transfer");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState([]);
  const [reference, setReference] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const mutation = useCreatePayment();
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers", "active"],
    queryFn: () =>
      api
        .get("/suppliers", { params: { status: "active", limit: 500 } })
        .then((response) => response.data),
    enabled: direction === "paid",
  });
  const { data: customersData } = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () =>
      customersApi.list({
        status: "active",
        limit: 500,
      }),
    enabled: direction === "received",
  });
  const { data: billsData } = useQuery({
    queryKey: ["supplierBills", supplierId],
    queryFn: () =>
      billsApi.list({
        supplierId,
        paymentStatus: "unpaid,partially_paid,overdue",
        limit: 100,
      }),
    enabled: direction === "paid" && !!supplierId,
  });
  const { data: invoicesData } = useQuery({
    queryKey: ["customerInvoices", customerId],
    queryFn: () =>
      invoicesApi.list({
        customerId,
        paymentStatus: "unpaid,partially_paid,overdue",
        limit: 100,
      }),
    enabled: direction === "received" && !!customerId,
  });
  const { data: accountsData } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () =>
      api.get("/bank-accounts").then((response) => response.data),
  });
  const bills = billsData?.data || [];
  const invoices = invoicesData?.data || [];
  const openDocuments = direction === "received"
    ? invoices
    : bills;
  const allocated = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0,
  );
  const unallocated = +(
    amount - allocated
  ).toFixed(2);
  const addDocument = (document) => {
    const documentType = direction === "received" ? "invoice" : "bill";
    const documentNumber = direction === "received"
      ? document.invoiceNumber
      : document.billNumber;

    setAllocations((current) => {
      if (
        current.some(
          (allocation) => allocation.documentId === document._id,
        )
      ) {
        return current;
      }

      return [
        ...current,
        {
          documentType,
          documentId: document._id,
          documentNumber,
          amount: document.balanceDue,
        },
      ];
    });
  };
  const removeAllocation = (index) => {
    setAllocations((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };
  const handleAllocationAmountChange = (index, value) => {
    setAllocations((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, amount: Number(value) } : item,
      ),
    );
  };
  const submit = async () => {
    if (!amount || amount <= 0) {
      return toast.error("Enter amount");
    }
    if (direction === "received" && !customerId) {
      return toast.error("Select customer");
    }
    if (direction === "paid" && !supplierId) {
      return toast.error("Select supplier");
    }
    if (allocated > Number(amount)) {
      return toast.error("Allocations exceed payment amount");
    }

    const result = await mutation.mutateAsync({
      direction,
      customerId: direction === "received" ? customerId : undefined,
      supplierId: direction === "paid" ? supplierId : undefined,
      amount: Number(amount),
      paymentDate,
      method,
      chequeNumber: method === "cheque" ? chequeNumber : undefined,
      chequeDate: method === "cheque" ? chequeDate : undefined,
      bankName: bankName || undefined,
      bankAccountId: bankAccountId || undefined,
      transactionReference: reference || undefined,
      allocations: allocations.filter(
        (allocation) => allocation.amount > 0,
      ),
      notes: notes || undefined,
    });
    router.push(`/payments/${result.data._id}`);
  };
  return (
    <div>
      <PageHeader
        title="Record Payment"
        actions={
          <Link href="/payments">
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
            <h3 className="font-semibold text-gray-700">Payment Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setDirection("received");
                  setSupplierId("");
                  setAllocations([]);
                }}
                className={`rounded-lg border p-3 ${
                  direction === "received"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                Money Received
              </button>
              <button
                onClick={() => {
                  setDirection("paid");
                  setCustomerId("");
                  setAllocations([]);
                }}
                className={`rounded-lg border p-3 ${
                  direction === "paid"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                Money Paid
              </button>
            </div>
            {direction === "received" && (
              <Select
                label="Customer"
                required
                options={(customersData?.data || []).map((customer) => ({
                  value: customer._id,
                  label: `${customer.displayName} (${customer.customerCode})`,
                }))}
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setAllocations([]);
                }}
              />
            )}
            {direction === "paid" && (
              <Select
                label="Supplier"
                required
                options={(suppliersData?.data || []).map((supplier) => ({
                  value: supplier._id,
                  label: `${supplier.displayName} (${supplier.supplierCode})`,
                }))}
                value={supplierId}
                onChange={(event) => {
                  setSupplierId(event.target.value);
                  setAllocations([]);
                }}
              />
            )}
            <Input
              label="Amount (LKR)"
              type="number"
              min="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
            <Select
              label="Method"
              options={[
                "cash",
                "bank_transfer",
                "cheque",
                "card",
                "mobile_wallet",
                "other",
              ].map((value) => ({
                value,
                label: value.replace("_", " "),
              }))}
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            />
            {method !== "cash" && (
              <Select
                label="Select Bank Account"
                options={(accountsData?.data || []).map((account) => ({
                  value: account._id,
                  label: `${account.accountName} (${account.bankName})`,
                }))}
                value={bankAccountId}
                onChange={(event) => setBankAccountId(event.target.value)}
              />
            )}
            {method === "cheque" && (
              <>
                <Input
                  label="Cheque Number"
                  value={chequeNumber}
                  onChange={(event) => setChequeNumber(event.target.value)}
                />
                <Input
                  label="Cheque Date"
                  type="date"
                  value={chequeDate}
                  onChange={(event) => setChequeDate(event.target.value)}
                />
              </>
            )}
            <Input
              label="Bank Name (optional)"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
            />
            <Input
              label="Transaction Reference (optional)"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
            <Textarea
              label="Notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-gray-700">
              Apply to Invoices/Bills
            </h3>
            {allocations.map((allocation, index) => (
              <div
                key={allocation.documentId}
                className="mb-2 flex items-center gap-2"
              >
                <Badge>{allocation.documentNumber}</Badge>
                <Input
                  type="number"
                  value={allocation.amount}
                  onChange={(event) =>
                    handleAllocationAmountChange(index, event.target.value)
                  }
                />
                <button
                  onClick={() => removeAllocation(index)}
                  className="text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {openDocuments.map((document) => (
              <button
                key={document._id}
                onClick={() => addDocument(document)}
                className="mb-1 flex w-full justify-between rounded border p-2 text-sm"
              >
                <span>
                  {direction === "received"
                    ? document.invoiceNumber
                    : document.billNumber}
                </span>
                <span>{money(document.balanceDue)}</span>
              </button>
            ))}
          </Card>
        </div>
        <Card className="h-fit p-6">
          <h3 className="mb-4 font-semibold">Summary</h3>
          <p>Payment: {money(amount)}</p>
          <p>Allocated: {money(allocated)}</p>
          <p className="border-t pt-2">Unallocated: {money(unallocated)}</p>
          <Button
            variant="primary"
            fullWidth
            className="mt-4"
            onClick={submit}
            loading={mutation.isPending}
            disabled={!amount || unallocated < 0}
          >
            <Save size={16} className="mr-1.5" />
            Record Payment
          </Button>
        </Card>
      </div>
    </div>
  );
}

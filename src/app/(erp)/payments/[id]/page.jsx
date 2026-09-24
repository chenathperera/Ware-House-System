"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import {
  useDeletePayment,
  usePayment,
} from "../../../../client/features/payments/usePayments.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { data, isLoading } = usePayment(id);
  const remove = useDeletePayment();
  const payment = data?.data;

  const deletePayment = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment? This action will reverse all invoice/bill allocations and restore bank account balances. This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    await remove.mutateAsync(id);
    router.push("/payments");
  };

  if (isLoading || !payment) {
    return <div className="py-16 text-center text-gray-500">Loading...</div>;
  }

  const formattedPaymentDate = new Date(payment.paymentDate).toLocaleDateString(
    "en-LK",
  );
  const formattedPaymentMethod = payment.method.replace("_", " ");

  return (
    <div>
      <PageHeader
        title={`Payment ${payment.paymentNumber}`}
        description={`${formattedPaymentDate} · ${formattedPaymentMethod}`}
        actions={
          <div className="flex gap-2">
            <Link href="/payments">
              <Button variant="outline">
                <ArrowLeft size={16} className="mr-1.5" />
                Back
              </Button>
            </Link>
            <Button
              variant="danger"
              onClick={deletePayment}
              loading={remove.isPending}
            >
              <Trash2 size={16} className="mr-1.5" />
              Delete
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Details</h3>
            <p>
              {payment.direction === "received" ? "From" : "To"}:{" "}
              {payment.partyName}
            </p>
            <p className="capitalize">
              Method: {formattedPaymentMethod}
            </p>
            {payment.chequeNumber && (
              <p>Cheque: {payment.chequeNumber}</p>
            )}
            {payment.chequeDate && (
              <p>
                Cheque Date:{" "}
                {new Date(payment.chequeDate).toLocaleDateString("en-LK")}
              </p>
            )}
            {payment.bankName && <p>Bank: {payment.bankName}</p>}
            {payment.bankAccountId && (
              <p>
                Linked Bank Account: {payment.bankAccountId.accountName}
              </p>
            )}
            {payment.transactionReference && (
              <p>Ref: {payment.transactionReference}</p>
            )}
            {payment.notes && <p>{payment.notes}</p>}
          </Card>
          {payment.allocations?.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Applied To</h3>
              {payment.allocations.map((allocation) => (
                <div
                  key={allocation._id}
                  className="flex justify-between border-b py-2"
                >
                  <Link
                    href={`/${allocation.documentType}s/${allocation.documentId}`}
                    className="text-primary-600"
                  >
                    {allocation.documentNumber}
                  </Link>
                  <span>{money(allocation.amount)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
        <Card className="h-fit p-6">
          <h3 className="mb-4 font-semibold">Summary</h3>
          <p>Amount: {money(payment.amount)}</p>
          <p>
            Allocated: {money(payment.amount - payment.unallocatedAmount)}
          </p>
          <p>Unallocated: {money(payment.unallocatedAmount)}</p>
          <Badge className="mt-3">{payment.status}</Badge>
        </Card>
      </div>
    </div>
  );
}

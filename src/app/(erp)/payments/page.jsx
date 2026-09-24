"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, Plus, Receipt } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import { usePayments } from "../../../client/features/payments/usePayments.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function PaymentsPage() {
  const [filters, setFilters] = useState({
    direction: "",
    method: "",
    page: 1,
    limit: 15,
  });
  const { data, isLoading } = usePayments(filters);
  const payments = data?.data || [];
  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };
  const columns = [
    {
      key: "paymentNumber",
      label: "Ref #",
      render: (payment) => (
        <span className="font-mono text-xs">{payment.paymentNumber}</span>
      ),
    },
    {
      key: "direction",
      label: "Type",
      render: (payment) => (
        <Badge variant={payment.direction === "received" ? "success" : "info"}>
          {payment.direction === "received" ? "IN" : "OUT"}
        </Badge>
      ),
    },
    {
      key: "paymentDate",
      label: "Date",
      render: (payment) =>
        new Date(payment.paymentDate).toLocaleDateString("en-LK"),
    },
    {
      key: "party",
      label: "Party",
      render: (payment) => (
        <div>
          <p className="font-medium">{payment.partyName}</p>
          <p className="text-xs text-gray-500">
            {payment.customerId?.customerCode || payment.supplierId?.supplierCode}
          </p>
        </div>
      ),
    },
    {
      key: "method",
      label: "Method",
      render: (payment) => (
        <span className="capitalize">{payment.method.replace("_", " ")}</span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (payment) => (
        <span
          className={`font-medium ${
            payment.direction === "received" ? "text-green-600" : "text-red-600"
          }`}
        >
          {payment.direction === "received" ? "+" : "-"}
          {money(payment.amount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (payment) => <Badge>{payment.status}</Badge>,
    },
    {
      key: "view",
      label: "",
      render: (payment) => (
        <Link
          href={`/payments/${payment._id}`}
          className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
        >
          <Eye size={16} />
        </Link>
      ),
    },
  ];
  return (
    <div>
      <PageHeader
        title="Payments"
        description="Customer payments received and supplier payments made"
        actions={
          <Link href="/payments/new">
            <Button variant="primary">
              <Plus size={16} className="mr-1.5" />
              Record Payment
            </Button>
          </Link>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="w-48">
            <Select
              placeholder="All Types"
              options={[
                { value: "received", label: "Received" },
                { value: "paid", label: "Paid Out" },
              ]}
              value={filters.direction}
              onChange={(event) =>
                updateFilter("direction", event.target.value)
              }
            />
          </div>
          <div className="w-48">
            <Select
              placeholder="All Methods"
              options={["cash", "cheque", "bank_transfer", "card", "mobile_wallet"].map(
                (value) => ({
                  value,
                  label: value.replace("_", " "),
                }),
              )}
              value={filters.method}
              onChange={(event) => updateFilter("method", event.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : payments.length ? (
          <>
            <Table columns={columns} data={payments} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              onPageChange={(page) =>
                setFilters((current) => ({ ...current, page }))
              }
            />
          </>
        ) : (
          <div className="py-16 text-center">
            <Receipt className="mx-auto mb-3 text-gray-300" />
            <h3 className="font-semibold">No payments</h3>
            <p className="text-sm text-gray-500">
              Record customer or supplier payments
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

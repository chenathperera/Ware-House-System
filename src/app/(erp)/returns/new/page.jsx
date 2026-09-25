"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
import { customersApi } from "../../../../client/features/customers/customersApi.js";
import { useCreateReturn, useEligibleOrders } from "../../../../client/features/returns/useReturns.js";

const reasonOptions = [
  { value: "damaged_on_arrival", label: "Damaged on arrival" },
  { value: "defective", label: "Defective" },
  { value: "wrong_item", label: "Wrong item sent" },
  { value: "not_as_described", label: "Not as described" },
  { value: "expired", label: "Expired" },
  { value: "overshipped", label: "Over-shipped" },
  { value: "customer_changed_mind", label: "Changed mind" },
  { value: "late_delivery", label: "Late delivery" },
  { value: "other", label: "Other" },
];

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function NewReturnPage() {
  const router = useRouter();
  const createMutation = useCreateReturn();
  const [customerId, setCustomerId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [items, setItems] = useState([]);
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const { data: customersData } = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () => customersApi.list({ status: "active", limit: 500 }),
  });
  const { data: ordersData } = useEligibleOrders(customerId);

  const customers = customersData?.data || [];
  // The eligible-orders endpoint has already filtered order status server-side.
  // Its source-compatible projection does not include `status` in each response row.
  const orders = useMemo(() => ordersData?.data || [], [ordersData?.data]);
  const customerOptions = customers.map((customer) => ({
    value: customer._id,
    label: `${customer.displayName} (${customer.customerCode})`,
  }));
  const availableItems = useMemo(() => {
    const itemList = [];
    orders
      .filter((order) => selectedOrderIds.includes(order._id))
      .forEach((order) => {
        order.items.forEach((item) => {
          itemList.push({
            salesOrderId: order._id,
            salesOrderLineId: item._id,
            orderNumber: order.orderNumber,
            productId: item.productId?._id || item.productId,
            productCode: item.productCode,
            productName: item.productName,
            unitPrice: item.unitPrice,
            unitOfMeasure: item.unitOfMeasure,
            maxQty: item.deliveredQuantity || item.orderedQuantity,
          });
        });
      });
    return itemList;
  }, [orders, selectedOrderIds]);
  const totals = useMemo(() => {
    const value = items.reduce(
      (sum, item) => sum + (+item.quantityReturned || 0) * (+item.unitPrice || 0),
      0,
    );
    const restocking = items.reduce(
      (sum, item) => sum + value * (+item.restockingFeePercent || 0) / 100,
      0,
    );
    const refund = items
      .filter((item) => item.refundable)
      .reduce((sum, item) => {
        const lineValue = (+item.quantityReturned || 0) * (+item.unitPrice || 0);
        return sum + lineValue - lineValue * (+item.restockingFeePercent || 0) / 100;
      }, 0);
    return {
      value: +value.toFixed(2),
      refund: +refund.toFixed(2),
      restocking: +restocking.toFixed(2),
    };
  }, [items]);

  const toggleOrder = (id) => {
    setSelectedOrderIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };
  const addItem = (source) => {
    setItems((current) => [
      ...current,
      {
        salesOrderId: source.salesOrderId,
        salesOrderLineId: source.salesOrderLineId,
        productId: source.productId,
        productCode: source.productCode,
        productName: source.productName,
        unitPrice: source.unitPrice,
        unitOfMeasure: source.unitOfMeasure,
        maxQty: source.maxQty,
        quantityReturned: 1,
        reason: "damaged_on_arrival",
        reasonDescription: "",
        refundable: true,
        restockingFeePercent: 0,
      },
    ]);
  };
  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };
  const submit = async () => {
    if (!customerId) {
      toast.error("Select customer");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        customerId,
        salesOrderIds: selectedOrderIds,
        items: items.map((item) => ({
          productId: item.productId,
          quantityReturned: +item.quantityReturned,
          unitPrice: +item.unitPrice,
          reason: item.reason,
          reasonDescription: item.reasonDescription || undefined,
          refundable: item.refundable,
          restockingFeePercent: +item.restockingFeePercent || 0,
          salesOrderId: item.salesOrderId,
          salesOrderLineId: item.salesOrderLineId,
        })),
        customerNotes: customerNotes || undefined,
        internalNotes: internalNotes || undefined,
      });
      router.push(`/returns/${result.data._id}`);
    } catch {}
  };

  return (
    <div>
      <PageHeader
        title="New Return Request (RMA)"
        actions={
          <Button variant="outline" onClick={() => router.push("/returns")}>
            <ArrowLeft size={16} className="mr-1.5" /> Back
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Customer &amp; Source Orders</h3>
            <Select
              label="Customer"
              required
              placeholder="Select customer..."
              options={customerOptions}
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setSelectedOrderIds([]);
                setItems([]);
              }}
            />
            {customerId && orders.length > 0 && <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Source Orders (optional — helps trace the return)</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {orders.map((order) => <label key={order._id} className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-gray-50">
                  <input type="checkbox" checked={selectedOrderIds.includes(order._id)} onChange={() => toggleOrder(order._id)} />
                  <span className="font-mono text-xs">{order.orderNumber}</span>
                  <span className="text-sm">— {money(order.grandTotal)}</span>
                  <span className="ml-auto text-xs text-gray-500">{new Date(order.orderDate).toLocaleDateString("en-LK")}</span>
                </label>)}
              </div>
            </div>}
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Items to Return</h3>
            {availableItems.length > 0 && <div className="mb-4">
              <p className="mb-2 text-xs text-gray-500">Pick items from selected orders:</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {availableItems
                  .filter((available) => !items.find((item) => item.salesOrderLineId === available.salesOrderLineId))
                  .map((available, index) => <button key={index} type="button" onClick={() => addItem(available)} className="flex w-full items-center justify-between rounded border p-2 text-sm hover:bg-gray-50">
                    <span>{available.productName} <span className="text-xs text-gray-500">({available.orderNumber})</span></span>
                    <span className="text-xs">Max {available.maxQty}</span>
                  </button>)}
              </div>
            </div>}
            <div className="space-y-3">
              {items.map((item, index) => <div key={index} className="rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between">
                  <div><p className="text-sm font-medium">{item.productName}</p><p className="font-mono text-xs text-gray-500">{item.productCode} · Max qty: {item.maxQty}</p></div>
                  <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
                <div className="mb-2 grid grid-cols-3 gap-2">
                  <Input label="Qty" type="number" step="0.01" min="0" max={item.remainingReturnableQuantity} value={item.quantityReturned} onChange={(event) => updateItem(index, "quantityReturned", event.target.value)} />
                  {item.alreadyReturnedQuantity > 0 && <p className="mt-1 text-xs text-gray-500">{item.alreadyReturnedQuantity} of {item.orderedQuantity} already returned. Remaining returnable: {item.remainingReturnableQuantity}</p>}
                  <Input label="Unit Price" type="number" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} />
                  <Input label="Restock Fee %" type="number" step="0.01" min="0" max="100" value={item.restockingFeePercent} onChange={(event) => updateItem(index, "restockingFeePercent", event.target.value)} />
                </div>
                <Select label="Reason" options={reasonOptions} value={item.reason} onChange={(event) => updateItem(index, "reason", event.target.value)} />
                <Textarea label="Reason details" rows={2} value={item.reasonDescription} onChange={(event) => updateItem(index, "reasonDescription", event.target.value)} />
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={item.refundable} onChange={(event) => updateItem(index, "refundable", event.target.checked)} /> Refundable</label>
              </div>)}
            </div>
          </Card>
          <Card className="p-6"><Textarea label="Customer Notes" rows={2} value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} /><Textarea label="Internal Notes" rows={2} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} /></Card>
        </div>
        <div><Card className="sticky top-6 p-6"><h3 className="mb-4 text-sm font-semibold">Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Return Value</span><span>{money(totals.value)}</span></div><div className="flex justify-between"><span className="text-gray-600">Restocking fees</span><span className="text-red-600">-{money(totals.restocking)}</span></div><div className="flex justify-between border-t pt-3 font-semibold"><span>Refund</span><span className="text-primary-600">{money(totals.refund)}</span></div></div><Button variant="primary" fullWidth className="mt-4" onClick={submit} loading={createMutation.isPending} disabled={!customerId || items.length === 0}><Save size={16} className="mr-1.5" /> Create RMA</Button><p className="mt-2 text-center text-xs text-gray-500">Will be saved as draft. Approve it to start processing.</p></Card></div>
      </div>
    </div>
  );
}


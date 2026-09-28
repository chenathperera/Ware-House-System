"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { customersApi } from "../../../client/features/customers/customersApi.js";
import { useCreateCustomer } from "../../../client/features/customers/useCustomers.js";
import { productsApi } from "../../../client/features/products/productsApi.js";
import { stockApi } from "../../../client/features/stock/stockApi.js";
import { useWarehouses } from "../../../client/features/warehouses/useWarehouses.js";
import { useCreateSalesOrder } from "../../../client/features/salesOrders/useSalesOrders.js";
import { useActivePosSession, useClosePosSession, useOpenPosSession } from "../../../client/features/posSessions/usePosSessions.js";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function PosPage() {
  const router = useRouter();
  const createOrder = useCreateSalesOrder();
  const createCustomer = useCreateCustomer();
  const openSession = useOpenPosSession();
  const closeSession = useClosePosSession();
  const { data: sessionData, isLoading: loadingSession } = useActivePosSession();
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [openingModal, setOpeningModal] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [actualBalance, setActualBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const activeSession = sessionData?.data;
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const { data: customersData } = useQuery({ queryKey: ["customers", "active", "pos"], queryFn: () => customersApi.list({ status: "active", limit: 500 }) });
  const { data: productsData } = useQuery({ queryKey: ["products", "active", "pos"], queryFn: () => productsApi.list({ status: "active", canBeSold: true, limit: 500 }) });
  const { data: stockData } = useQuery({ queryKey: ["stock", "pos", warehouseId], queryFn: () => stockApi.list({ warehouseId, limit: 500 }), enabled: !!warehouseId });
  const warehouses = warehousesData?.data || [];
  const customers = customersData?.data || [];
  const products = productsData?.data || [];
  useEffect(() => { if (!warehouseId && warehouses.length) setWarehouseId((warehouses.find((warehouse) => warehouse.isDefault) || warehouses[0])._id); }, [warehouseId, warehouses]);
  const stock = useMemo(() => { const map = new Map(); (stockData?.data || []).forEach((item) => { const id = item.productId?._id || item.productId; const current = map.get(id) || { onHand: 0, reserved: 0 }; current.onHand += item.quantities?.onHand || 0; current.reserved += item.quantities?.reserved || 0; map.set(id, current); }); return map; }, [stockData]);
  const visibleProducts = products.filter((product) => product.canBeSold !== false && (!search || [product.name, product.productCode, product.barcode].some((value) => value?.toLowerCase().includes(search.toLowerCase()))));
  const totals = useMemo(() => { const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0); const discount = subtotal * (+discountPercent || 0) / 100 + (+discountAmount || 0); return { subtotal: +subtotal.toFixed(2), discount: +discount.toFixed(2), grandTotal: +(subtotal - discount).toFixed(2) }; }, [cart, discountPercent, discountAmount]);
  const addProduct = (product) => { const available = Math.max(0, (stock.get(product._id)?.onHand || 0) - (stock.get(product._id)?.reserved || 0)); const line = cart.find((item) => item.productId === product._id); if (!available || line?.qty >= available) return toast.error(!available ? `${product.name} is out of stock at this warehouse` : `Only ${available} available`); setCart((items) => line ? items.map((item) => item.productId === product._id ? { ...item, qty: item.qty + 1 } : item) : [...items, { productId: product._id, name: product.name, price: product.basePrice, qty: 1, available }]); };
  const updateQty = (id, quantity) => setCart((items) => items.flatMap((item) => { if (item.productId !== id) return [item]; const qty = Math.max(0, quantity); if (qty > item.available) { toast.error(`Only ${item.available} available`); return [item]; } return qty ? [{ ...item, qty }] : []; }));
  const submitOrder = async (draft = false) => {
    let finalCustomerId = customerId;
    if (!finalCustomerId && customerName) finalCustomerId = (await createCustomer.mutateAsync({ displayName: customerName, primaryContact: { name: customerName, phone: customerPhone || undefined }, customerType: "individual", status: "active" })).data._id;
    if (!finalCustomerId) return toast.error("Select or type a customer");
    if (!warehouseId) return toast.error("Select a warehouse");
    if (!cart.length) return toast.error("Cart is empty");
    if (!activeSession) { toast.error("You must open the cash register first"); setOpeningModal(true); return; }
    if (!draft && cashReceived === "") return setCashModal(true);
    if (!draft && +cashReceived < totals.grandTotal) return toast.error("Cash received is less than total payable!");
    const result = await createOrder.mutateAsync({ customerId: finalCustomerId, sourceWarehouseId: warehouseId, source: "pos", items: cart.map((item) => ({ productId: item.productId, orderedQuantity: item.qty, unitPrice: item.price, discountPercent: 0 })), orderDiscount: totals.discount > 0 ? { type: "fixed", value: totals.discount } : undefined, status: draft ? "draft" : "approved", cashReceived: draft ? undefined : +cashReceived, changeReturned: draft ? undefined : +cashReceived - totals.grandTotal });
    if (draft) return router.push(`/sales-orders/${result.data._id}`);
    setCart([]); setCustomerId(""); setCustomerName(""); setCustomerPhone(""); setDiscountPercent(0); setDiscountAmount(0); setCashReceived(""); router.push(`/receipt/${result.invoiceId}`);
  };
  const expected = (activeSession?.openingBalance || 0) + (activeSession?.cashSales || 0) - (activeSession?.cashExpenses || 0);
  if (loadingSession) return <div className="py-12 text-center">Loading POS...</div>;
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">POS Terminal</h1><p className="text-sm text-gray-500">Cash register and point-of-sale checkout</p></div><div className="flex gap-2">{activeSession ? <Button variant="outline" onClick={() => setClosingModal(true)}>Close Register</Button> : <Button variant="primary" onClick={() => setOpeningModal(true)}>Open Cash Register</Button>}<Link href="/pos-sessions"><Button variant="outline">POS Registers</Button></Link></div></div><div className="grid gap-4 lg:grid-cols-3"><div className="space-y-4 lg:col-span-2"><Card className="p-4"><div className="grid gap-3 md:grid-cols-2"><Select label="Warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} options={warehouses.map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }))} /><Select label="Customer" value={customerId} onChange={(event) => { setCustomerId(event.target.value); setCustomerName(""); }} options={customers.map((customer) => ({ value: customer._id, label: `${customer.displayName} (${customer.customerCode})` }))} /></div><div className="mt-3 grid gap-3 md:grid-cols-2"><Input label="Or type customer name" value={customerName} disabled={!!customerId} onChange={(event) => setCustomerName(event.target.value)} /><Input label="Customer phone" value={customerPhone} disabled={!!customerId} onChange={(event) => setCustomerPhone(event.target.value)} /></div></Card><Card className="p-4"><div className="relative mb-4"><Search className="absolute left-3 top-3 text-gray-400" size={18} /><Input className="pl-10" placeholder="Search products by name, code, or barcode..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.slice(0, 60).map((product) => { const available = Math.max(0, (stock.get(product._id)?.onHand || 0) - (stock.get(product._id)?.reserved || 0)); return <button key={product._id} type="button" onClick={() => addProduct(product)} className="rounded-lg border p-3 text-left hover:border-primary-400 hover:bg-primary-50 disabled:opacity-50" disabled={!available}><p className="font-medium">{product.name}</p><p className="text-xs text-gray-500">{product.productCode}</p><div className="mt-2 flex justify-between text-sm"><span>{money(product.basePrice)}</span><span className={available ? "text-emerald-600" : "text-red-600"}>{available} available</span></div></button>; })}</div></Card></div><Card className="h-fit p-4"><h2 className="mb-3 flex items-center gap-2 font-semibold"><ShoppingCart size={18} />Cart</h2>{cart.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">Your cart is empty.</p> : <div className="space-y-3">{cart.map((item) => <div key={item.productId} className="border-b pb-3"><p className="font-medium">{item.name}</p><p className="text-sm">{money(item.price)}</p><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-1"><Button size="sm" variant="outline" onClick={() => updateQty(item.productId, item.qty - 1)}><Minus size={14} /></Button><span className="w-8 text-center">{item.qty}</span><Button size="sm" variant="outline" onClick={() => updateQty(item.productId, item.qty + 1)}><Plus size={14} /></Button></div><button type="button" onClick={() => updateQty(item.productId, 0)} className="text-red-600"><Trash2 size={16} /></button></div></div>)}<Input label="Order discount %" type="number" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} /><Input label="Order discount amount" type="number" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /><div className="space-y-1 border-t pt-3 text-sm"><p className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></p><p className="flex justify-between"><span>Discount</span><span>-{money(totals.discount)}</span></p><p className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(totals.grandTotal)}</span></p></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => submitOrder(true)} disabled={createOrder.isPending}>Draft</Button><Button variant="primary" onClick={() => submitOrder(false)} disabled={createOrder.isPending}>Checkout</Button></div></div>}</Card></div><Modal isOpen={openingModal} onClose={() => setOpeningModal(false)} title="Open Cash Register"><div className="space-y-4 p-5"><p className="text-sm text-gray-500">Please enter the opening cash balance in the drawer to start selling.</p><Input label="Opening Balance (LKR)" type="number" required value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /><Textarea label="Notes (Optional)" value={openingNotes} onChange={(event) => setOpeningNotes(event.target.value)} /><Button fullWidth variant="primary" loading={openSession.isPending} onClick={async () => { await openSession.mutateAsync({ openingBalance: openingBalance || 0, notes: openingNotes }); setOpeningModal(false); }}>Open Register</Button></div></Modal><Modal isOpen={closingModal} onClose={() => setClosingModal(false)} title="Close Cash Register (Handover)"><div className="space-y-4 p-5"><div className="rounded-lg border bg-gray-50 p-4 text-sm"><p>Opening Balance: {money(activeSession?.openingBalance)}</p><p>Cash Sales: +{money(activeSession?.cashSales)}</p><p>Cash Expenses: -{money(activeSession?.cashExpenses)}</p><p className="mt-2 border-t pt-2 font-bold">Expected Cash in Drawer: {money(expected)}</p></div><Input label="Actual Cash in Drawer (LKR)" type="number" required value={actualBalance} onChange={(event) => setActualBalance(event.target.value)} /><p className="font-bold">Difference: {money((+actualBalance || 0) - expected)}</p><Textarea label="Closing Notes / Handover Details" value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} /><Button fullWidth variant="primary" loading={closeSession.isPending} onClick={async () => { await closeSession.mutateAsync({ actualClosingBalance: actualBalance || 0, notes: closingNotes }); setClosingModal(false); }}>Close Register</Button></div></Modal><Modal isOpen={cashModal} onClose={() => setCashModal(false)} title="POS Cash Payment Calculator"><div className="space-y-4 p-5"><p>Total payable: <strong>{money(totals.grandTotal)}</strong></p><Input label="Cash Received (LKR)" type="number" autoFocus value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} /><p className="font-bold">Change to Return: {money(Math.max(0, (+cashReceived || 0) - totals.grandTotal))}</p><Button fullWidth variant="primary" onClick={() => { setCashModal(false); submitOrder(false); }} disabled={(+cashReceived || 0) < totals.grandTotal}>Confirm & Pay</Button></div></Modal></div>;
}

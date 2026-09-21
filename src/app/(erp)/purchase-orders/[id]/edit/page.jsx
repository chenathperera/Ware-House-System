import PurchaseOrderForm from "../../../../../client/features/purchaseOrders/PurchaseOrderForm.jsx";
export default async function EditPurchaseOrderPage({ params }) { const { id } = await params; return <PurchaseOrderForm purchaseOrderId={id} />; }

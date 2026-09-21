export const directLine = () => ({
  productId: "",
  receivedQuantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  discountAmount: 0,
  freeQuantity: 0,
});

export function calculateReceiptTotals(items, billDiscountPercent, billDiscountAmount) {
  const subtotal = items.reduce(
    (sum, item) => sum + (+item.receivedQuantity || 0) * (+item.unitPrice || 0),
    0,
  );
  const lineDiscounts = items.reduce((sum, item) => {
    const lineTotal = (+item.receivedQuantity || 0) * (+item.unitPrice || 0);
    return sum + (+item.discountAmount || lineTotal * (+item.discountPercent || 0) / 100);
  }, 0);
  const valueBeforeBillDiscount = Math.max(0, subtotal - lineDiscounts);
  const totalBillDiscount = valueBeforeBillDiscount * (+billDiscountPercent || 0) / 100 + (+billDiscountAmount || 0);
  return {
    subtotal,
    lineDiscounts,
    totalBillDiscount,
    grandTotal: Math.max(0, valueBeforeBillDiscount - totalBillDiscount),
  };
}

export function updateReceiptLine(items, index, field, value, products = []) {
  const next = [...items];
  next[index] = { ...next[index], [field]: value };
  const item = next[index];
  if (field === "productId") {
    const product = products.find((entry) => entry._id === value);
    if (product) item.unitPrice = product.basePrice || 0;
  }
  const lineTotal = (+item.receivedQuantity || 0) * (+item.unitPrice || 0);
  if (["productId", "receivedQuantity", "unitPrice", "discountPercent"].includes(field) && +item.discountPercent > 0) {
    item.discountAmount = (lineTotal * (+item.discountPercent) / 100).toFixed(2);
  }
  if (field === "discountAmount") {
    item.discountPercent = value && lineTotal > 0 ? ((+value / lineTotal) * 100).toFixed(2) : "";
  }
  return next;
}

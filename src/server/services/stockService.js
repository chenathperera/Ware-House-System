import "server-only";
import StockItem from "../models/StockItem.js";
import StockMovement from "../models/StockMovement.js";
import StockReservation from "../models/StockReservation.js";
import Product from "../models/Product.js";
import Warehouse from "../models/Warehouse.js";

const sessionOption = (session) => ({ session: session || undefined });

export async function increaseStock({ productId, warehouseId, quantity, costPerUnit = 0, movementType, batchNumber = null, sourceDocument, reason, notes, userId, session }) {
  if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than 0");
  const product = await Product.findById(productId).session(session || null);
  if (!product) throw new Error(`Product ${productId} not found`);
  const warehouse = await Warehouse.findById(warehouseId).session(session || null);
  if (!warehouse) throw new Error(`Warehouse ${warehouseId} not found`);
  let stockItem = await StockItem.findOne({ productId, warehouseId, batchNumber }).session(session || null);
  const balanceBefore = stockItem?.quantities?.onHand || 0;
  if (!stockItem) {
    stockItem = new StockItem({ productId, productCode: product.productCode, productName: product.name, warehouseId, batchNumber, unitOfMeasure: product.unitOfMeasure, costPerUnit, quantities: { onHand: quantity, reserved: 0, available: quantity } });
  } else {
    const totalQty = stockItem.quantities.onHand + quantity;
    stockItem.costPerUnit = totalQty > 0 ? +(((stockItem.quantities.onHand * stockItem.costPerUnit) + (quantity * costPerUnit)) / totalQty).toFixed(2) : costPerUnit;
    stockItem.quantities.onHand += quantity;
  }
  stockItem.lastMovementDate = new Date();
  await stockItem.save(sessionOption(session));
  const movement = new StockMovement({ productId, productCode: product.productCode, productName: product.name, batchNumber, movementType, direction: "in", quantity, unitOfMeasure: product.unitOfMeasure, warehouseId, costPerUnit, totalCost: +(quantity * costPerUnit).toFixed(2), balanceBefore, balanceAfter: stockItem.quantities.onHand, sourceDocument, reason, notes, performedBy: userId });
  await movement.save(sessionOption(session));
  if (movementType === "purchase_receipt" || movementType === "opening_stock") await Product.findByIdAndUpdate(productId, { "costs.lastPurchaseCost": costPerUnit, "costs.averageCost": stockItem.costPerUnit }, { session: session || null });
  return { stockItem, movement };
}

export async function decreaseStock({ productId, warehouseId, quantity, movementType, batchNumber = null, sourceDocument, reason, notes, userId, session, allowNegative = false }) {
  if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than 0");
  const stockItem = await StockItem.findOne({ productId, warehouseId, batchNumber }).session(session || null);
  if (!stockItem) throw new Error("No stock found for this product in the selected warehouse");
  const balanceBefore = stockItem.quantities.onHand;
  if (!allowNegative && stockItem.quantities.onHand < quantity) throw new Error(`Insufficient stock. On hand: ${stockItem.quantities.onHand}, requested: ${quantity}`);
  stockItem.quantities.onHand -= quantity;
  stockItem.lastMovementDate = new Date();
  await stockItem.save(sessionOption(session));
  const product = await Product.findById(productId).session(session || null);
  const movement = new StockMovement({ productId, productCode: product?.productCode, productName: product?.name, batchNumber, movementType, direction: "out", quantity, unitOfMeasure: stockItem.unitOfMeasure, warehouseId, costPerUnit: stockItem.costPerUnit, totalCost: +(quantity * stockItem.costPerUnit).toFixed(2), balanceBefore, balanceAfter: stockItem.quantities.onHand, sourceDocument, reason, notes, performedBy: userId });
  await movement.save(sessionOption(session));
  return { stockItem, movement };
}

export async function reserveStock({ productId, warehouseId, quantity, sourceDocument, userId, session }) {
  const stockItem = await StockItem.findOne({ productId, warehouseId, batchNumber: null }).session(session || null);
  if (!stockItem) throw new Error("No stock found for product in selected warehouse");
  const available = stockItem.quantities.onHand - stockItem.quantities.reserved;
  if (available < quantity) throw new Error(`Insufficient available stock. Available: ${available}, requested: ${quantity}`);
  stockItem.quantities.reserved += quantity;
  await stockItem.save(sessionOption(session));
  const reservation = new StockReservation({ productId, warehouseId, quantity, unitOfMeasure: stockItem.unitOfMeasure, sourceDocument, reservedBy: userId });
  await reservation.save(sessionOption(session));
  return { stockItem, reservation };
}

export async function releaseReservations({ sourceDocumentId, reason = "", session }) {
  const reservations = await StockReservation.find({ "sourceDocument.id": sourceDocumentId, status: "active" }).session(session || null);
  for (const reservation of reservations) {
    const item = await StockItem.findOne({ productId: reservation.productId, warehouseId: reservation.warehouseId, batchNumber: reservation.batchNumber }).session(session || null);
    if (item) { item.quantities.reserved = Math.max(0, item.quantities.reserved - reservation.quantity); await item.save(sessionOption(session)); }
    reservation.status = "cancelled"; reservation.cancelledAt = new Date(); reservation.cancellationReason = reason;
    await reservation.save(sessionOption(session));
  }
  return reservations.length;
}

export async function fulfillReservations({ sourceDocumentId, sourceDocumentNumber, userId, session }) {
  const reservations = await StockReservation.find({ "sourceDocument.id": sourceDocumentId, status: "active" }).session(session || null);
  for (const reservation of reservations) {
    const item = await StockItem.findOne({ productId: reservation.productId, warehouseId: reservation.warehouseId, batchNumber: reservation.batchNumber }).session(session || null);
    if (item) { item.quantities.reserved = Math.max(0, item.quantities.reserved - reservation.quantity); await item.save(sessionOption(session)); }
    await decreaseStock({ productId: reservation.productId, warehouseId: reservation.warehouseId, quantity: reservation.quantity, movementType: "sale_dispatch", batchNumber: reservation.batchNumber, sourceDocument: { type: "sales_order", id: sourceDocumentId, number: sourceDocumentNumber }, userId, session });
    reservation.status = "fulfilled"; reservation.fulfilledAt = new Date(); await reservation.save(sessionOption(session));
  }
  return reservations.length;
}

export async function getAvailableStock(productId, warehouseId) {
  const item = await StockItem.findOne({ productId, warehouseId, batchNumber: null });
  if (!item) return { onHand: 0, reserved: 0, available: 0 };
  return { onHand: item.quantities.onHand, reserved: item.quantities.reserved, available: item.quantities.onHand - item.quantities.reserved };
}

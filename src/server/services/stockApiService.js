import "server-only";
import mongoose from "mongoose";
import StockItem from "../models/StockItem.js";
import StockMovement from "../models/StockMovement.js";
import StockReservation from "../models/StockReservation.js";
import { decreaseStock, increaseStock } from "./stockService.js";

export async function getStockItems(req, res) {
  const { search, productId, warehouseId, lowStock, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (productId) filter.productId = productId;
  if (warehouseId) filter.warehouseId = warehouseId;
  if (search) filter.$or = [{ productCode: { $regex: search, $options: "i" } }, { productName: { $regex: search, $options: "i" } }];
  let items = await StockItem.find(filter).populate("productId", "name productCode sku stockLevels costs purchasePrice").populate("warehouseId", "name warehouseCode").sort({ productName: 1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
  if (lowStock === "true") items = items.filter((item) => { const reorder = item.productId?.stockLevels?.reorderLevel || 0; return item.quantities.onHand <= reorder && reorder > 0; });
  const total = await StockItem.countDocuments(filter);
  res.json({ success: true, count: items.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: items });
}

export async function getStockByProduct(req, res) {
  const items = await StockItem.find({ productId: req.params.productId }).populate("warehouseId", "name warehouseCode type");
  const totals = items.reduce((sum, item) => ({ onHand: sum.onHand + item.quantities.onHand, reserved: sum.reserved + item.quantities.reserved, available: sum.available + item.quantities.onHand - item.quantities.reserved }), { onHand: 0, reserved: 0, available: 0 });
  res.json({ success: true, data: { items, totals } });
}

export async function getStockMovements(req, res) {
  const { productId, warehouseId, movementType, startDate, endDate, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (productId) filter.productId = productId;
  if (warehouseId) filter.$or = [{ warehouseId }, { fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
  if (movementType) filter.movementType = movementType;
  if (startDate || endDate) { filter.timestamp = {}; if (startDate) filter.timestamp.$gte = new Date(startDate); if (endDate) filter.timestamp.$lte = new Date(endDate); }
  const [movements, total] = await Promise.all([StockMovement.find(filter).populate("productId", "name productCode").populate("warehouseId", "name warehouseCode").populate("fromWarehouseId", "name warehouseCode").populate("toWarehouseId", "name warehouseCode").populate("performedBy", "firstName lastName").sort({ timestamp: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)), StockMovement.countDocuments(filter)]);
  res.json({ success: true, count: movements.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: movements });
}

export async function createOpeningStock(req, res) {
  const { warehouseId, items, notes } = req.body;
  if (!warehouseId) { res.status(400); throw new Error("warehouseId is required"); }
  if (!items || !Array.isArray(items) || items.length === 0) { res.status(400); throw new Error("At least one item is required"); }
  const session = await mongoose.startSession(); const results = [];
  try { await session.withTransaction(async () => { for (const item of items) { if (!item.productId || !item.quantity) continue; results.push(await increaseStock({ productId: item.productId, warehouseId, quantity: Number(item.quantity), costPerUnit: Number(item.costPerUnit) || 0, movementType: "opening_stock", sourceDocument: { type: "opening_stock", number: "OPENING" }, reason: "Opening stock entry", notes, userId: req.user._id, session })); } }); res.status(201).json({ success: true, message: `Opening stock recorded for ${results.length} items`, data: results.map((result) => ({ stockItem: result.stockItem, movementNumber: result.movement.movementNumber })) }); } finally { session.endSession(); }
}

export async function transferStock(req, res) {
  const { fromWarehouseId, toWarehouseId, items, notes } = req.body;
  if (!fromWarehouseId || !toWarehouseId) { res.status(400); throw new Error("fromWarehouseId and toWarehouseId are required"); }
  if (fromWarehouseId === toWarehouseId) { res.status(400); throw new Error("From and to warehouses must be different"); }
  if (!items?.length) { res.status(400); throw new Error("At least one item is required"); }
  const session = await mongoose.startSession(); const movements = [];
  try { await session.withTransaction(async () => { for (const item of items) { if (!item.productId || !item.quantity) continue; const out = await decreaseStock({ productId: item.productId, warehouseId: fromWarehouseId, quantity: Number(item.quantity), movementType: "transfer_out", sourceDocument: { type: "stock_transfer", number: "TRF" }, reason: "Stock transfer", notes, userId: req.user._id, session }); const incoming = await increaseStock({ productId: item.productId, warehouseId: toWarehouseId, quantity: Number(item.quantity), costPerUnit: out.stockItem.costPerUnit, movementType: "transfer_in", sourceDocument: { type: "stock_transfer", number: "TRF" }, reason: "Stock transfer", notes, userId: req.user._id, session }); movements.push({ out: out.movement, in: incoming.movement }); } }); res.status(201).json({ success: true, message: `Transferred ${movements.length} items`, data: movements }); } finally { session.endSession(); }
}

export async function adjustStock(req, res) {
  const { warehouseId, items, notes, reason } = req.body;
  if (!warehouseId) { res.status(400); throw new Error("warehouseId is required"); }
  if (!items?.length) { res.status(400); throw new Error("At least one item is required"); }
  const session = await mongoose.startSession(); const results = [];
  try { await session.withTransaction(async () => { for (const item of items) { const quantity = Number(item.adjustmentQuantity); if (!item.productId || !quantity) continue; const common = { productId: item.productId, warehouseId, quantity: Math.abs(quantity), sourceDocument: { type: "stock_adjustment", number: "ADJ" }, reason: item.reason || reason || "Stock adjustment", notes, userId: req.user._id, session }; const result = quantity > 0 ? await increaseStock({ ...common, costPerUnit: Number(item.costPerUnit) || 0, movementType: "adjustment_in" }) : await decreaseStock({ ...common, movementType: "adjustment_out" }); results.push(result.movement); } }); res.status(201).json({ success: true, message: `Adjusted ${results.length} items`, data: results }); } finally { session.endSession(); }
}

export async function getReservations(req, res) {
  const { productId, warehouseId, status = "active" } = req.query; const filter = { status }; if (productId) filter.productId = productId; if (warehouseId) filter.warehouseId = warehouseId;
  const reservations = await StockReservation.find(filter).populate("productId", "name productCode").populate("warehouseId", "name warehouseCode").populate("reservedBy", "firstName lastName").sort({ reservedAt: -1 });
  res.json({ success: true, count: reservations.length, data: reservations });
}

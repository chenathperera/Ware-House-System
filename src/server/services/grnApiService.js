import "server-only";
import mongoose from "mongoose";
import GoodsReceiptNote from "../models/GoodsReceiptNote.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { increaseStock, decreaseStock } from "./stockService.js";

function listPopulate(query) {
  return query.populate("purchaseOrderId", "poNumber").populate("supplierId", "displayName supplierCode").populate("warehouseId", "name warehouseCode");
}

export async function createGrn(req, res) {
  const { purchaseOrderId, supplierId, warehouseId, items, ...rest } = req.body;
  let po = null;
  if (purchaseOrderId) {
    po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) { res.status(404); throw new Error("Purchase order not found"); }
    if (!["approved", "sent", "partially_received"].includes(po.status)) { res.status(400); throw new Error(`Cannot receive against PO with status '${po.status}'`); }
  }
  if (!po && !supplierId) { res.status(400); throw new Error("Supplier ID is required for GRN without Purchase Order"); }
  const poItems = po ? new Map(po.items.map((item) => [item._id.toString(), item])) : null;
  const session = await mongoose.startSession();
  let grn;
  try {
    await session.withTransaction(async () => {
      const grnItems = items.map((item) => {
        const poLine = po && item.poLineItemId ? poItems.get(item.poLineItemId) : null;
        return {
          poLineItemId: item.poLineItemId, productId: item.productId,
          productCode: item.productCode || poLine?.productCode || "", productName: item.productName || poLine?.productName || "",
          orderedQuantity: poLine?.orderedQuantity || 0, receivedQuantity: item.receivedQuantity,
          acceptedQuantity: item.acceptedQuantity ?? item.receivedQuantity, rejectedQuantity: item.rejectedQuantity || 0,
          damagedQuantity: item.damagedQuantity || 0, discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0, freeQuantity: item.freeQuantity || 0,
          unitOfMeasure: item.unitOfMeasure || poLine?.unitOfMeasure || "", unitPrice: item.unitPrice || poLine?.unitPrice || 0,
          batchNumber: item.batchNumber || null, manufactureDate: item.manufactureDate || null, expiryDate: item.expiryDate || null,
          rejectionReason: item.rejectionReason, notes: item.notes,
          qcStatus: item.rejectionReason || item.rejectedQuantity > 0 ? "failed" : "not_required",
        };
      });
      grn = new GoodsReceiptNote({ purchaseOrderId: po?._id, poNumber: po?.poNumber, supplierId: po?.supplierId || supplierId, supplierName: po?.supplierSnapshot?.name || rest.supplierName, warehouseId, items: grnItems, status: "received", receivedBy: req.user._id, createdBy: req.user._id, ...rest });
      await grn.save({ session });
      const rawAcceptedValue = grn.items.reduce((sum, item) => {
        const lineTotal = (item.acceptedQuantity || item.receivedQuantity || 0) * item.unitPrice;
        return sum + Math.max(0, lineTotal - (item.discountAmount || lineTotal * (item.discountPercent || 0) / 100));
      }, 0);
      for (const item of grn.items) {
        const quantity = item.acceptedQuantity + (item.freeQuantity || 0);
        if (quantity <= 0) continue;
        const lineTotal = item.acceptedQuantity * item.unitPrice;
        const rawCost = Math.max(0, lineTotal - (item.discountAmount || lineTotal * (item.discountPercent || 0) / 100));
        let finalCost = rawCost;
        if (grn.billDiscountPercent > 0) finalCost -= rawCost * grn.billDiscountPercent / 100;
        if (grn.billDiscountAmount > 0 && rawAcceptedValue > 0) finalCost -= grn.billDiscountAmount * (rawCost / rawAcceptedValue);
        const result = await increaseStock({ productId: item.productId, warehouseId, quantity, costPerUnit: Math.max(0, finalCost) / quantity, movementType: "purchase_receipt", batchNumber: item.batchNumber || null, sourceDocument: { type: "purchase_receipt", id: grn._id, number: grn.grnNumber }, reason: po ? `GRN against PO ${po.poNumber}` : "GRN (direct)", userId: req.user._id, session });
        item.stockMovementId = result.movement._id;
      }
      await grn.save({ session });
      if (po) {
        for (const item of grn.items) {
          if (!item.poLineItemId) continue;
          const poLine = po.items.id(item.poLineItemId);
          if (poLine) poLine.receivedQuantity = (poLine.receivedQuantity || 0) + item.acceptedQuantity;
        }
        po.grns = [...(po.grns || []), grn._id];
        await po.save({ session });
      }
    });
    res.status(201).json({ success: true, message: "Goods received and stock updated", data: await listPopulate(GoodsReceiptNote.findById(grn._id)).populate("items.productId", "name productCode") });
  } catch (error) { res.status(400); throw new Error(error.message || "Failed to create GRN"); } finally { await session.endSession(); }
}

export async function getGrns(req, res) {
  const { search, purchaseOrderId, supplierId, warehouseId, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (search) filter.grnNumber = { $regex: search, $options: "i" };
  if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
  if (supplierId) filter.supplierId = supplierId;
  if (warehouseId) filter.warehouseId = warehouseId;
  if (status) filter.status = status;
  const [grns, total] = await Promise.all([listPopulate(GoodsReceiptNote.find(filter)).sort({ receiptDate: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)), GoodsReceiptNote.countDocuments(filter)]);
  res.json({ success: true, count: grns.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: grns });
}

export async function getGrnById(req, res) {
  const grn = await GoodsReceiptNote.findById(req.params.id).populate("purchaseOrderId", "poNumber poDate").populate("supplierId", "displayName supplierCode").populate("warehouseId", "name warehouseCode").populate("items.productId", "name productCode").populate("items.stockMovementId", "movementNumber").populate("receivedBy", "firstName lastName").populate("createdBy", "firstName lastName");
  if (!grn) { res.status(404); throw new Error("GRN not found"); }
  res.json({ success: true, data: grn });
}

export async function cancelGrn(req, res) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const grn = await GoodsReceiptNote.findById(req.params.id).session(session);
      if (!grn) throw new Error("GRN not found");
      if (grn.status === "cancelled") throw new Error("GRN already cancelled");
      for (const item of grn.items) {
        const quantity = item.acceptedQuantity + (item.freeQuantity || 0);
        if (quantity <= 0) continue;
        await decreaseStock({ productId: item.productId, warehouseId: grn.warehouseId, quantity, movementType: "adjustment_out", batchNumber: item.batchNumber || null, sourceDocument: { type: "grn_cancellation", id: grn._id, number: grn.grnNumber }, reason: `Cancellation of GRN ${grn.grnNumber}`, userId: req.user._id, session });
      }
      if (grn.purchaseOrderId) {
        const po = await PurchaseOrder.findById(grn.purchaseOrderId).session(session);
        if (po) { for (const item of grn.items) { const poLine = item.poLineItemId && po.items.id(item.poLineItemId); if (poLine) poLine.receivedQuantity = Math.max(0, (poLine.receivedQuantity || 0) - item.acceptedQuantity); } await po.save({ session }); }
      }
      // Source defect intentionally retained: this enum excludes cancelled and these audit fields are not in the schema.
      grn.status = "cancelled"; grn.cancelledAt = new Date(); grn.cancelledBy = req.user._id;
      await grn.save({ session });
    });
    res.json({ success: true, message: "GRN cancelled and stock reversed" });
  } catch (error) { res.status(400); throw new Error(error.message || "Failed to cancel GRN"); } finally { await session.endSession(); }
}

import "server-only";
import mongoose from "mongoose";
import SupplierReturn from "../models/SupplierReturn.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import "../models/Warehouse.js";
import "../models/GoodsReceiptNote.js";
import "../models/PurchaseOrder.js";
import "../models/User.js";
import "../models/StockMovement.js";
import { decreaseStock } from "./stockService.js";

const listPopulate = (query) => query
  .populate("supplierId", "displayName supplierCode")
  .populate("warehouseId", "name warehouseCode");

export async function createSupplierReturn(req, res) {
  const { supplierId, warehouseId, items, ...rest } = req.body;
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) { res.status(404); throw new Error("Supplier not found"); }
  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) } });
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  const enrichedItems = items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    return {
      productId: product._id,
      productCode: product.productCode,
      productName: product.name,
      unitOfMeasure: product.unitOfMeasure,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      reason: item.reason,
      reasonDescription: item.reasonDescription,
      grnId: item.grnId,
      poId: item.poId,
    };
  });
  const supplierReturn = new SupplierReturn({
    supplierId: supplier._id,
    supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode },
    warehouseId,
    items: enrichedItems,
    ...rest,
    createdBy: req.user._id,
  });
  await supplierReturn.save();
  const populated = await listPopulate(SupplierReturn.findById(supplierReturn._id))
    .populate("items.productId", "name productCode");
  res.status(201).json({ success: true, data: populated });
}

export async function getSupplierReturns(req, res) {
  const { supplierId, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (supplierId) filter.supplierId = supplierId;
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    listPopulate(SupplierReturn.find(filter)).sort({ returnDate: -1 }).skip(skip).limit(Number(limit)),
    SupplierReturn.countDocuments(filter),
  ]);
  res.json({ success: true, count: data.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data });
}

export async function getSupplierReturnById(req, res) {
  const data = await listPopulate(SupplierReturn.findById(req.params.id))
    .populate("items.productId", "name productCode")
    .populate("items.grnId", "grnNumber")
    .populate("items.poId", "poNumber")
    .populate("approvedBy", "firstName lastName")
    .populate("createdBy", "firstName lastName");
  if (!data) { res.status(404); throw new Error("Supplier return not found"); }
  res.json({ success: true, data });
}

export async function sendSupplierReturn(req, res) {
  const supplierReturn = await SupplierReturn.findById(req.params.id);
  if (!supplierReturn) { res.status(404); throw new Error("Supplier return not found"); }
  if (!["draft", "approved"].includes(supplierReturn.status)) {
    res.status(400);
    throw new Error(`Cannot send return with status '${supplierReturn.status}'`);
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of supplierReturn.items) {
        const result = await decreaseStock({
          productId: item.productId,
          warehouseId: supplierReturn.warehouseId,
          quantity: item.quantity,
          movementType: "supplier_return",
          sourceDocument: { type: "supplier_return", id: supplierReturn._id, number: supplierReturn.returnNumber },
          reason: `Returned to supplier ${supplierReturn.supplierSnapshot.name}`,
          userId: req.user._id,
          session,
        });
        item.stockMovementId = result.movement._id;
      }
      supplierReturn.status = "sent";
      supplierReturn.approvedBy = req.user._id;
      await supplierReturn.save({ session });
    });
    res.json({ success: true, message: "Supplier return sent, stock decreased", data: supplierReturn });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  } finally { await session.endSession(); }
}

export async function recordSupplierCredit(req, res) {
  const { actualCreditReceived, creditReferenceNumber, creditReceivedDate } = req.body;
  const supplierReturn = await SupplierReturn.findById(req.params.id);
  if (!supplierReturn) { res.status(404); throw new Error("Supplier return not found"); }
  if (supplierReturn.status !== "sent") { res.status(400); throw new Error("Return must be sent first"); }
  supplierReturn.actualCreditReceived = actualCreditReceived;
  supplierReturn.creditReferenceNumber = creditReferenceNumber;
  supplierReturn.creditReceivedDate = creditReceivedDate ? new Date(creditReceivedDate) : new Date();
  supplierReturn.status = "credit_received";
  await supplierReturn.save();
  res.json({ success: true, data: supplierReturn });
}

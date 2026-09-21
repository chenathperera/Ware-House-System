import "server-only";
import mongoose from "mongoose";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import Warehouse from "../models/Warehouse.js";

function populated(id) {
  return PurchaseOrder.findById(id)
    .populate("supplierId", "displayName supplierCode")
    .populate("deliverTo.warehouseId", "name warehouseCode");
}

export async function createPurchaseOrder(req, res) {
  const { supplierId, deliverTo, items, ...rest } = req.body;
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) { res.status(404); throw new Error("Supplier not found"); }
  if (supplier.status === "blacklisted") { res.status(400); throw new Error("Cannot create PO for blacklisted supplier"); }
  const warehouse = await Warehouse.findById(deliverTo.warehouseId);
  if (!warehouse) { res.status(404); throw new Error("Warehouse not found"); }
  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) } });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const enrichedItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    return { productId: product._id, productCode: product.productCode, productName: product.name, orderedQuantity: item.orderedQuantity, unitOfMeasure: product.unitOfMeasure, unitPrice: item.unitPrice, discountPercent: item.discountPercent || 0, discountAmount: item.discountAmount || 0, taxRate: item.taxRate ?? (product.tax?.taxRate || 0), taxable: item.taxable ?? (product.tax?.taxable ?? true), notes: item.notes };
  });
  const po = new PurchaseOrder({ supplierId: supplier._id, supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode, taxRegistrationNumber: supplier.taxRegistrationNumber, contactName: supplier.primaryContact?.name, phone: supplier.primaryContact?.phone }, supplierBillingAddress: supplier.billingAddress, deliverTo: { warehouseId: warehouse._id, warehouseName: warehouse.name, address: warehouse.address }, paymentTerms: { type: supplier.paymentTerms?.type || "credit", creditDays: supplier.paymentTerms?.creditDays || 0 }, items: enrichedItems, ...rest, createdBy: req.user._id });
  await po.save(); res.status(201).json({ success: true, data: await populated(po._id) });
}
export async function getPurchaseOrders(req, res) { const { search, supplierId, status, warehouseId, startDate, endDate, page = 1, limit = 20, sortBy = "poDate", sortOrder = "desc" } = req.query; const filter = {}; if (search) filter.$or = [{ poNumber: { $regex: search, $options: "i" } }, { "supplierSnapshot.name": { $regex: search, $options: "i" } }]; if (supplierId) filter.supplierId = supplierId; if (status) filter.status = status; if (warehouseId) filter["deliverTo.warehouseId"] = warehouseId; if (startDate || endDate) { filter.poDate = {}; if (startDate) filter.poDate.$gte = new Date(startDate); if (endDate) filter.poDate.$lte = new Date(endDate); } const [orders, total] = await Promise.all([PurchaseOrder.find(filter).populate("supplierId", "displayName supplierCode").populate("deliverTo.warehouseId", "name warehouseCode").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)), PurchaseOrder.countDocuments(filter)]); res.json({ success: true, count: orders.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: orders }); }
export async function getPurchaseOrderById(req, res) {
  let query = PurchaseOrder.findById(req.params.id)
    .populate("supplierId", "displayName supplierCode taxRegistrationNumber primaryContact")
    .populate("deliverTo.warehouseId", "name warehouseCode")
    .populate("items.productId", "name productCode")
    .populate("approvedBy", "firstName lastName")
    .populate("cancelledBy", "firstName lastName")
    .populate("createdBy", "firstName lastName");

  // GRN has not been migrated yet. Preserve the original populated behavior
  // whenever its model is registered, while keeping PO detail available until then.
  if (mongoose.models.GoodsReceiptNote) query = query.populate("grns");

  const po = await query;
  if (!po) { res.status(404); throw new Error("Purchase order not found"); }
  res.json({ success: true, data: po });
}
export async function updatePurchaseOrder(req, res) {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) { res.status(404); throw new Error("Purchase order not found"); }
  if (!["draft", "pending_approval"].includes(po.status)) {
    res.status(400);
    throw new Error(`Cannot edit PO with status '${po.status}'`);
  }

  if (req.body.items) {
    const productIds = req.body.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    req.body.items = req.body.items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        ...item,
        productCode: product?.productCode,
        productName: product?.name,
        unitOfMeasure: product?.unitOfMeasure,
        taxRate: item.taxRate ?? (product?.tax?.taxRate || 0),
        taxable: item.taxable ?? (product?.tax?.taxable ?? true),
      };
    });
  }

  Object.assign(po, req.body);
  po.updatedBy = req.user._id;
  await po.save();
  res.json({ success: true, data: po });
}
export async function changePurchaseOrderStatus(req, res) { const { status, reason } = req.body; const po = await PurchaseOrder.findById(req.params.id); if (!po) { res.status(404); throw new Error("Purchase order not found"); } const allowed = { draft: ["approved", "cancelled"], pending_approval: ["approved", "cancelled"], approved: ["sent", "cancelled"], sent: ["cancelled"], partially_received: ["closed", "cancelled"], fully_received: ["closed"] }; if (!allowed[po.status]?.includes(status)) { res.status(400); throw new Error(`Cannot change status from '${po.status}' to '${status}'`); } po.status = status; po.updatedBy = req.user._id; if (status === "approved") { po.approvedBy = req.user._id; po.approvedAt = new Date(); } if (status === "sent") po.sentToSupplierAt = new Date(); if (status === "cancelled") { po.cancelledBy = req.user._id; po.cancelledAt = new Date(); po.cancellationReason = reason; } await po.save(); res.json({ success: true, message: `PO status changed to ${status}`, data: po }); }
export async function deletePurchaseOrder(req, res) { const po = await PurchaseOrder.findById(req.params.id); if (!po) { res.status(404); throw new Error("Purchase order not found"); } if (po.status !== "draft") { res.status(400); throw new Error("Only draft POs can be deleted"); } po.deletedAt = new Date(); await po.save(); res.json({ success: true, message: "Draft PO deleted" }); }

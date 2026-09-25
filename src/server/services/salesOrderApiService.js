import "server-only";
import mongoose from "mongoose";
import SalesOrder from "../models/SalesOrder.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Warehouse from "../models/Warehouse.js";
import StockItem from "../models/StockItem.js";
import { decreaseStock, increaseStock } from "./stockService.js";
import { generateInvoiceFromOrders, updateCustomerBalance } from "./invoiceApiService.js";

const populatedOrder = (id) => SalesOrder.findById(id)
  .populate("customerId", "displayName customerCode")
  .populate("salesRepId", "firstName lastName")
  .populate("items.productId", "name productCode");

export async function createSalesOrder(req, res) {
  const { customerId, items, shippingAddressLabel, creditOverride, creditOverrideReason, ...rest } = req.body;
  const customer = await Customer.findById(customerId).populate("customerGroupId");
  if (!customer) { res.status(404); throw new Error("Customer not found"); }
  let warehouse = null;
  if (req.body.sourceWarehouseId) {
    warehouse = await Warehouse.findById(req.body.sourceWarehouseId);
    if (!warehouse) { res.status(404); throw new Error("Warehouse not found"); }
  } else if (req.user.role === "sales_rep") {
    warehouse = await Warehouse.findOne({ warehouseManager: req.user._id, isActive: true });
    if (!warehouse) warehouse = await Warehouse.findOne({ isDefault: true, isActive: true });
  } else warehouse = await Warehouse.findOne({ isDefault: true, isActive: true });
  if (customer.creditStatus?.onCreditHold && !creditOverride) { res.status(400); throw new Error(`Customer is on credit hold: ${customer.creditStatus.creditHoldReason || "No reason provided"}`); }
  if (customer.status === "blacklisted") { res.status(400); throw new Error("Cannot create order for blacklisted customer"); }
  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) }, status: "active" });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const enrichedItems = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) { res.status(400); throw new Error(`Product ${item.productId} not found or inactive`); }
    enrichedItems.push({ productId: product._id, productCode: product.productCode, productName: product.name, orderedQuantity: item.orderedQuantity, unitOfMeasure: product.unitOfMeasure, listPrice: product.basePrice, unitPrice: item.unitPrice ?? product.basePrice, discountPercent: item.discountPercent || 0, discountAmount: item.discountAmount || 0, taxRate: item.taxRate ?? (product.tax?.taxRate || 0), taxable: item.taxable ?? (product.tax?.taxable ?? true), notes: item.notes });
  }
  const billingAddress = customer.billingAddress?.toObject?.() || customer.billingAddress;
  let shippingAddress = billingAddress;
  if (shippingAddressLabel && customer.shippingAddresses?.length) {
    const match = customer.shippingAddresses.find((address) => address.label === shippingAddressLabel);
    if (match) shippingAddress = match.toObject?.() || match;
  } else if (customer.shippingAddresses?.length) {
    const defaultAddress = customer.shippingAddresses.find((address) => address.isDefault) || customer.shippingAddresses[0];
    shippingAddress = defaultAddress.toObject?.() || defaultAddress;
  }
  const orderData = { ...rest, customerId: customer._id, sourceWarehouseId: warehouse?._id, sourceWarehouseSnapshot: warehouse ? { name: warehouse.name, warehouseCode: warehouse.warehouseCode } : undefined, customerSnapshot: { name: customer.displayName, code: customer.customerCode, taxRegistrationNumber: customer.taxRegistrationNumber, contactName: customer.primaryContact?.name, phone: customer.primaryContact?.phone }, billingAddress, shippingAddress, shippingAddressLabel, salesRepId: customer.assignedSalesRep || req.user._id, items: enrichedItems, paymentTerms: { type: customer.paymentTerms?.type || "cod", creditDays: customer.paymentTerms?.creditDays || 0 }, createdBy: req.user._id };
  const order = new SalesOrder(orderData);
  let invoice;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const temporaryStatus = orderData.status || "draft";
      order.status = "draft";
      await order.save({ session });
      if (customer.paymentTerms?.type === "credit") {
        const available = customer.creditStatus?.availableCredit || 0;
        const required = order.grandTotal;
        const passed = required <= available;
        order.creditCheck = { performed: true, passed, creditAvailable: available, creditRequired: required, overridden: false };
        if (!passed) {
          if (creditOverride && ["admin", "manager", "accountant"].includes(req.user.role)) { order.creditCheck.overridden = true; order.creditCheck.overrideReason = creditOverrideReason; order.creditCheck.overrideBy = req.user._id; order.status = temporaryStatus; }
          else { order.status = "pending_approval"; order.holdReason = `Exceeds credit limit. Required: ${required}, Available: ${available}`; order.isOnHold = true; }
        } else order.status = temporaryStatus;
      } else order.status = temporaryStatus;
      if (order.status === "approved") {
        for (const item of order.items) {
          const stockItem = await StockItem.findOne({ productId: item.productId, warehouseId: warehouse._id, batchNumber: null }).session(session);
          if (!stockItem || stockItem.quantities.onHand < item.orderedQuantity) throw new Error(`Insufficient stock for "${item.productName}"`);
          await decreaseStock({ productId: item.productId, warehouseId: warehouse._id, quantity: item.orderedQuantity, movementType: "sale_dispatch", sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber }, reason: "Order created as approved", userId: req.user._id, session });
          item.dispatchedQuantity = item.orderedQuantity;
          item.lineStatus = "dispatched";
        }
        order.approvedBy = req.user._id;
        order.approvedAt = new Date();
      }
      await order.save({ session });
      if (order.source === "pos" && order.status === "approved") {
        invoice = await generateInvoiceFromOrders({ salesOrderIds: [order._id], createdBy: req.user._id, session });
        const Payment = (await import("../models/Payment.js")).default;
        const PosSession = (await import("../models/PosSession.js")).default;
        const BankAccount = (await import("../models/BankAccount.js")).default;
        const receivingAccount = await BankAccount.findOne({ category: "received", isActive: true }).session(session);
        let receivingAccountId;
        if (receivingAccount) { receivingAccountId = receivingAccount._id; receivingAccount.currentBalance = +(receivingAccount.currentBalance + invoice.grandTotal).toFixed(2); await receivingAccount.save({ session }); }
        const payment = new Payment({ direction: "received", customerId: order.customerId, partyName: order.customerSnapshot.name, amount: invoice.grandTotal, method: "cash", bankAccountId: receivingAccountId, allocations: [{ documentType: "invoice", documentId: invoice._id, documentNumber: invoice.invoiceNumber, amount: invoice.grandTotal }], status: "cleared", receivedBy: req.user._id, createdBy: req.user._id });
        await payment.save({ session });
        invoice.amountPaid = invoice.grandTotal; invoice.balanceDue = 0; invoice.paymentStatus = "paid"; invoice.fullyPaidAt = new Date(); invoice.cashReceived = order.cashReceived; invoice.changeReturned = order.changeReturned;
        await invoice.save({ session });
        await updateCustomerBalance(order.customerId, session);
        const activeSession = await PosSession.findOne({ userId: req.user._id, status: "open" }).session(session);
        if (activeSession) { activeSession.cashSales += invoice.grandTotal; await activeSession.save({ session }); }
      }
    });
  } catch (error) { res.status(400); throw new Error(error.message); } finally { session.endSession(); }
  res.status(201).json({ success: true, data: await populatedOrder(order._id), invoiceId: invoice ? (invoice._id || invoice.id) : undefined });
}

export async function getSalesOrders(req, res) {
  const { search, customerId, status, salesRepId, startDate, endDate, page = 1, limit = 20, sortBy = "orderDate", sortOrder = "desc" } = req.query;
  const filter = {};
  if (search) filter.$or = [{ orderNumber: { $regex: search, $options: "i" } }, { "customerSnapshot.name": { $regex: search, $options: "i" } }, { "customerSnapshot.code": { $regex: search, $options: "i" } }];
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  if (salesRepId) filter.salesRepId = salesRepId;
  if (startDate || endDate) { filter.orderDate = {}; if (startDate) filter.orderDate.$gte = new Date(startDate); if (endDate) filter.orderDate.$lte = new Date(endDate); }
  if (req.user.role === "sales_rep") filter.salesRepId = req.user._id;
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([SalesOrder.find(filter).populate("customerId", "displayName customerCode customerGroupId").populate("salesRepId", "firstName lastName").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(Number(limit)), SalesOrder.countDocuments(filter)]);
  res.json({ success: true, count: orders.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: orders });
}

export async function getSalesOrderById(req, res) {
  const order = await SalesOrder.findById(req.params.id).populate("customerId", "displayName customerCode taxRegistrationNumber primaryContact").populate("salesRepId", "firstName lastName email phone").populate("items.productId", "name productCode sku basePrice").populate("createdBy", "firstName lastName").populate("approvedBy", "firstName lastName").populate("cancelledBy", "firstName lastName").populate("creditCheck.overrideBy", "firstName lastName");
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  if (req.user.role === "sales_rep" && order.salesRepId?._id.toString() !== req.user._id.toString()) { res.status(403); throw new Error("Not authorized to view this order"); }
  res.json({ success: true, data: order });
}

export async function updateSalesOrder(req, res) {
  const order = await SalesOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  if (!["draft", "pending_approval"].includes(order.status)) { res.status(400); throw new Error(`Cannot edit order with status '${order.status}'`); }
  if (req.body.items) {
    const products = await Product.find({ _id: { $in: req.body.items.map((item) => item.productId) } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    req.body.items = req.body.items.map((item) => { const product = productMap.get(item.productId); return { ...item, productCode: product?.productCode, productName: product?.name, unitOfMeasure: product?.unitOfMeasure, listPrice: product?.basePrice, unitPrice: item.unitPrice ?? product?.basePrice, taxRate: item.taxRate ?? (product?.tax?.taxRate || 0), taxable: item.taxable ?? (product?.tax?.taxable ?? true) }; });
  }
  Object.assign(order, req.body); order.updatedBy = req.user._id; await order.save();
  res.json({ success: true, data: await populatedOrder(order._id) });
}

export async function changeSalesOrderStatus(req, res) {
  const { status, reason } = req.body;
  const order = await SalesOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  const allowedTransitions = { draft: ["approved", "cancelled"], pending_approval: ["approved", "cancelled"], approved: ["dispatched", "cancelled", "on_hold"], on_hold: ["approved", "cancelled"], dispatched: ["delivered", "cancelled"], delivered: ["completed"] };
  if (!allowedTransitions[order.status]?.includes(status)) { res.status(400); throw new Error(`Cannot change status from '${order.status}' to '${status}'`); }
  if (status === "approved" && !["admin", "manager", "sales_manager", "accountant"].includes(req.user.role)) { res.status(403); throw new Error("Not authorized to approve orders"); }
  let warehouseId = order.sourceWarehouseId;
  if (!warehouseId) { const defaultWarehouse = await Warehouse.findOne({ isDefault: true, isActive: true }); if (!defaultWarehouse && status === "approved") { res.status(400); throw new Error("Order has no warehouse set and no default warehouse exists. Please set a warehouse before approving."); } warehouseId = defaultWarehouse?._id; }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (status === "approved" && order.status !== "approved") {
        for (const item of order.items) {
          const stockItem = await StockItem.findOne({ productId: item.productId, warehouseId, batchNumber: null }).session(session);
          if (!stockItem) throw new Error(`No stock record found for "${item.productName}" in the selected warehouse. Please enter opening stock first.`);
          if (stockItem.quantities.onHand < item.orderedQuantity) throw new Error(`Insufficient stock for "${item.productName}". On hand: ${stockItem.quantities.onHand}, ordered: ${item.orderedQuantity}`);
          await decreaseStock({ productId: item.productId, warehouseId, quantity: item.orderedQuantity, movementType: "sale_dispatch", sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber }, reason: "Sales order approved", userId: req.user._id, session });
          item.dispatchedQuantity = item.orderedQuantity; item.lineStatus = "dispatched";
        }
        order.approvedBy = req.user._id; order.approvedAt = new Date(); order.isOnHold = false; order.holdReason = null;
      }
      if (status === "dispatched" && order.status !== "dispatched") for (const item of order.items) if (item.lineStatus !== "dispatched") { item.dispatchedQuantity = item.orderedQuantity; item.lineStatus = "dispatched"; }
      if (status === "delivered" && order.status !== "delivered") for (const item of order.items) { item.deliveredQuantity = item.dispatchedQuantity || item.orderedQuantity; item.lineStatus = "delivered"; }
      if (status === "cancelled" && ["approved", "dispatched", "on_hold"].includes(order.status)) for (const item of order.items) { try { await increaseStock({ productId: item.productId, warehouseId, quantity: item.orderedQuantity, costPerUnit: 0, movementType: "sale_return", sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber }, reason: reason || "Order cancelled — stock restored", userId: req.user._id, session }); } catch (stockError) { console.warn(`Stock restore failed for ${item.productName}:`, stockError.message); } }
      order.status = status; order.updatedBy = req.user._id;
      if (status === "cancelled") { order.cancelledBy = req.user._id; order.cancelledAt = new Date(); order.cancellationReason = reason; }
      if (status === "on_hold") { order.isOnHold = true; order.holdReason = reason; }
      await order.save({ session });
    });
    res.json({ success: true, message: `Order status changed to ${status}`, data: order });
  } catch (error) { res.status(400); throw new Error(error.message || "Failed to change order status"); } finally { session.endSession(); }
}

export async function deleteSalesOrder(req, res) {
  const order = await SalesOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  if (order.status !== "draft") { res.status(400); throw new Error("Only draft orders can be deleted. Cancel non-draft orders instead."); }
  order.deletedAt = new Date(); await order.save();
  res.json({ success: true, message: "Draft order deleted" });
}

import "server-only";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import CompanySettings from "../models/CompanySettings.js";
import Invoice from "../models/Invoice.js";
import "../models/User.js";

let lastInvoiceAgingUpdate = null;

export async function generateInvoiceFromOrders({ salesOrderIds, invoiceDate, invoiceType = "standard", notes, createdBy, status = "approved", session }) {
  const SalesOrder = (await import("../models/SalesOrder.js")).default;
  const orders = await SalesOrder.find({ _id: { $in: salesOrderIds }, status: { $in: ["approved", "dispatched", "delivered", "completed"] } }).populate("customerId").session(session || null);
  if (orders.length === 0) throw new Error("No valid orders found for invoicing");
  const customer = orders[0].customerId;
  const items = [];
  orders.forEach((order) => order.items.forEach((item) => {
    const quantity = item.deliveredQuantity || item.orderedQuantity;
    if (quantity <= 0) return;
    items.push({ productId: item.productId, productCode: item.productCode, productName: item.productName, description: item.description, quantity, unitOfMeasure: item.unitOfMeasure, unitPrice: item.unitPrice, discountPercent: item.discountPercent, taxRate: item.taxRate, taxable: item.taxable, salesOrderLineId: item._id });
  }));
  const dueDate = new Date(invoiceDate || Date.now());
  if (customer.paymentTerms?.type === "credit") dueDate.setDate(dueDate.getDate() + (customer.paymentTerms.creditDays || 0));
  const invoice = new Invoice({ customerId: customer._id, customerSnapshot: { name: customer.displayName, code: customer.customerCode, taxRegistrationNumber: customer.taxRegistrationNumber, contactName: customer.primaryContact?.name, phone: customer.primaryContact?.phone }, billingAddress: customer.billingAddress, shippingAddress: orders[0].shippingAddress || customer.billingAddress, salesOrderIds: orders.map((order) => order._id), salesOrderNumbers: orders.map((order) => order.orderNumber), invoiceType, invoiceDate: invoiceDate || new Date(), dueDate: customer.paymentTerms?.type === "credit" ? dueDate : undefined, salesRepId: orders[0].salesRepId, paymentTerms: { type: customer.paymentTerms?.type || "cod", creditDays: customer.paymentTerms?.creditDays || 0 }, items, orderDiscount: orders[0].orderDiscount, notes, status, createdBy });
  await invoice.save({ session: session || undefined });
  for (const order of orders) { order.status = "invoiced"; await order.save({ session: session || undefined }); }
  await updateCustomerBalance(customer._id, session);
  return invoice;
}

export async function createInvoiceFromSalesOrder(req, res) {
  const { salesOrderIds, invoiceDate, invoiceType = "standard", notes } = req.body;
  try {
    const invoice = await generateInvoiceFromOrders({ salesOrderIds, invoiceDate, invoiceType, notes, createdBy: req.user._id });
    const populated = await Invoice.findById(invoice._id).populate("customerId", "displayName customerCode").populate("salesOrderIds", "orderNumber");
    res.status(201).json({ success: true, data: populated });
  } catch (error) { res.status(400); throw new Error(error.message); }
}

export async function updateCustomerBalance(customerId, session) {
  const rows = await Invoice.aggregate([
    {
      $match: {
        customerId: new mongoose.Types.ObjectId(customerId),
        paymentStatus: { $in: ["unpaid", "partially_paid", "overdue"] },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        totalBalance: { $sum: "$balanceDue" },
        overdueAmount: {
          $sum: {
            $cond: [
              { $in: ["$paymentStatus", ["overdue"]] },
              "$balanceDue",
              0,
            ],
          },
        },
      },
    },
  ]).session(session || null);

  const summary = rows[0] || { totalBalance: 0, overdueAmount: 0 };
  const customer = await Customer.findById(customerId).session(session || null);
  if (!customer) return;

  customer.creditStatus.currentBalance = +summary.totalBalance.toFixed(2);
  customer.creditStatus.overdueAmount = +summary.overdueAmount.toFixed(2);
  customer.creditStatus.isOverdue = summary.overdueAmount > 0;
  customer.creditStatus.availableCredit = Math.max(
    0,
    (customer.paymentTerms?.creditLimit || 0) -
      customer.creditStatus.currentBalance,
  );

  await customer.save({ session: session || undefined });
}

export async function createInvoice(req, res) {
  const { customerId, items, dueDate, ...rest } = req.body;
  const customer = await Customer.findById(customerId);

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  let finalDueDate = dueDate;
  if (!finalDueDate && customer.paymentTerms?.type === "credit") {
    const invoiceDate = new Date(rest.invoiceDate || Date.now());
    invoiceDate.setDate(
      invoiceDate.getDate() + (customer.paymentTerms.creditDays || 0),
    );
    finalDueDate = invoiceDate;
  }

  const invoice = new Invoice({
    customerId: customer._id,
    customerSnapshot: {
      name: customer.displayName,
      code: customer.customerCode,
      taxRegistrationNumber: customer.taxRegistrationNumber,
      contactName: customer.primaryContact?.name,
    },
    billingAddress: customer.billingAddress,
    shippingAddress:
      customer.shippingAddresses?.find((address) => address.isDefault) ||
      customer.billingAddress,
    salesRepId: customer.assignedSalesRep,
    paymentTerms: {
      type: customer.paymentTerms?.type || "cod",
      creditDays: customer.paymentTerms?.creditDays || 0,
    },
    dueDate: finalDueDate,
    items,
    ...rest,
    createdBy: req.user._id,
  });

  await invoice.save();
  await updateCustomerBalance(customer._id);

  const populated = await Invoice.findById(invoice._id)
    .populate("customerId", "displayName customerCode");

  res.status(201).json({ success: true, data: populated });
}

export async function getInvoices(req, res) {
  await updateInvoiceAging();
  const {
    search,
    customerId,
    paymentStatus,
    status,
    agingBucket,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = "invoiceDate",
    sortOrder = "desc",
    salesOrderId,
  } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
      { "customerSnapshot.name": { $regex: search, $options: "i" } },
      { "customerSnapshot.code": { $regex: search, $options: "i" } },
    ];
  }
  if (customerId) filter.customerId = customerId;
  if (salesOrderId) filter.salesOrderIds = salesOrderId;
  if (paymentStatus) {
    const statuses = paymentStatus
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    filter.paymentStatus =
      statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  if (status) filter.status = status;
  if (agingBucket) filter.agingBucket = agingBucket;
  if (startDate || endDate) {
    filter.invoiceDate = {};
    if (startDate) filter.invoiceDate.$gte = new Date(startDate);
    if (endDate) filter.invoiceDate.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
  const [data, total] = await Promise.all([
    Invoice.find(filter)
      .populate("customerId", "displayName customerCode")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Invoice.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: data.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data,
  });
}

export async function updateInvoiceAging(force = false) {
  const today = new Date().toDateString();
  if (!force && lastInvoiceAgingUpdate === today) return;

  const invoices = await Invoice.find({
    paymentStatus: { $in: ["unpaid", "partially_paid", "overdue"] },
    deletedAt: null,
  }).select("_id customerId dueDate daysPastDue paymentStatus agingBucket");
  const now = new Date();
  const bulkOps = [];
  const customerIds = new Set();

  for (const invoice of invoices) {
    if (!invoice.dueDate) continue;
    const daysPastDue = Math.max(
      0,
      Math.floor((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
    );
    let paymentStatus = invoice.paymentStatus;
    if (daysPastDue > 0 && paymentStatus === "unpaid") paymentStatus = "overdue";
    let agingBucket = "current";
    if (daysPastDue <= 30 && daysPastDue > 0) agingBucket = "1_30";
    else if (daysPastDue <= 60 && daysPastDue > 0) agingBucket = "31_60";
    else if (daysPastDue <= 90 && daysPastDue > 0) agingBucket = "61_90";
    else if (daysPastDue > 90) agingBucket = "91_plus";

    if (invoice.daysPastDue !== daysPastDue || invoice.paymentStatus !== paymentStatus || invoice.agingBucket !== agingBucket) {
      bulkOps.push({ updateOne: { filter: { _id: invoice._id }, update: { $set: { daysPastDue, paymentStatus, agingBucket } } } });
      customerIds.add(String(invoice.customerId));
    }
  }
  if (bulkOps.length) {
    await Invoice.bulkWrite(bulkOps);
    for (const customerId of customerIds) await updateCustomerBalance(customerId);
  }
  lastInvoiceAgingUpdate = today;
}

export async function getReceivablesAging(req, res) {
  await updateInvoiceAging();
  const match = {
    paymentStatus: { $in: ["unpaid", "partially_paid", "overdue"] },
    deletedAt: null,
  };
  if (req.query.customerId) match.customerId = new mongoose.Types.ObjectId(req.query.customerId);
  const rows = await Invoice.aggregate([
    { $match: match },
    { $group: { _id: "$agingBucket", count: { $sum: 1 }, total: { $sum: "$balanceDue" } } },
  ]);
  const buckets = { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "91_plus": 0 };
  const counts = { ...buckets };
  rows.forEach((row) => {
    if (row._id in buckets) {
      buckets[row._id] = row.total;
      counts[row._id] = row.count;
    }
  });
  res.json({ success: true, data: { buckets, counts, totalOutstanding: Object.values(buckets).reduce((sum, value) => sum + value, 0) } });
}

export async function getInvoiceById(req, res) {
  const invoice = await Invoice.findById(req.params.id)
    .populate(
      "customerId",
      "displayName customerCode taxRegistrationNumber primaryContact paymentTerms creditStatus",
    )
    .populate("salesRepId", "firstName lastName")
    .populate("createdBy", "firstName lastName")
    .populate("cancelledBy", "firstName lastName");

  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  res.json({ success: true, data: invoice });
}

export async function getInvoicePrintJson(req, res) {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  const settings = (await CompanySettings.findOne()) || {
    companyName: "RC TRADERS",
    address: "Colombo, Sri Lanka",
    phone: "+94 11 XXX XXXX",
    receiptFooterMessage: "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.",
  };
  const printSequence = [];
  const addText = (content, bold = 0, align = 0, format = 0) => {
    printSequence.push({ type: 0, content: content || " ", bold, align, format });
  };
  const formatLine = (left, right, width = 38) => {
    const spaces = width - left.length - right.length;
    return spaces > 0 ? left + " ".repeat(spaces) + right : left + " " + right;
  };

  addText(settings.companyName, 1, 1, 0);
  if (settings.address) addText(settings.address, 0, 1, 0);
  if (settings.phone) addText(`TEL: ${settings.phone}`, 0, 1, 0);
  if (settings.email) addText(settings.email, 0, 1, 0);
  if (settings.taxRegistrationNumber) addText(`VAT NO: ${settings.taxRegistrationNumber}`, 1, 1, 0);
  addText("======================================", 0, 1, 0);
  addText(formatLine("Receipt No:", invoice.invoiceNumber || ""), 1, 0, 0);
  const date = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleString("en-LK", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : "—";
  addText(formatLine("Date:", date), 0, 0, 0);

  const customer = invoice.customerSnapshot || {};
  if (customer.name) addText(formatLine("Customer:", customer.name), 1, 0, 0);
  if (customer.phone) addText(formatLine("Contact:", customer.phone), 0, 0, 0);
  addText("--------------------------------------", 0, 1, 0);
  addText(formatLine("Description", "Amount"), 1, 0, 0);
  addText("--------------------------------------", 0, 1, 0);
  for (const item of invoice.items || []) {
    addText(item.productName, 1, 0, 0);
    addText(formatLine(`  ${item.quantity} x ${item.unitPrice.toFixed(2)}`, item.lineTotal.toFixed(2)), 0, 0, 0);
    if (item.discountPercent > 0) addText(`    Disc: ${item.discountPercent}% (-${item.lineDiscount.toFixed(2)})`, 0, 0, 4);
  }

  addText("--------------------------------------", 0, 1, 0);
  addText(formatLine("Subtotal", invoice.subtotal.toFixed(2)), 0, 0, 0);
  const discount = (invoice.totalDiscount || 0) + (invoice.orderDiscount?.amount || 0);
  if (discount > 0) addText(formatLine("Discount", `-${discount.toFixed(2)}`), 0, 0, 0);
  if (invoice.totalTax > 0) addText(formatLine("Tax", invoice.totalTax.toFixed(2)), 0, 0, 0);
  addText("======================================", 0, 1, 0);
  addText(formatLine("TOTAL", invoice.grandTotal.toFixed(2)), 1, 0, 1);
  addText(formatLine("Paid Amount", invoice.grandTotal.toFixed(2)), 1, 0, 0);
  if (invoice.cashReceived !== undefined && invoice.cashReceived > 0) addText(formatLine("Cash Received", invoice.cashReceived.toFixed(2)), 0, 0, 0);
  if (invoice.changeReturned !== undefined && invoice.changeReturned > 0) addText(formatLine("Change Returned", invoice.changeReturned.toFixed(2)), 0, 0, 0);
  addText(formatLine("Amount Due", (invoice.balanceDue || 0).toFixed(2)), 1, 0, 0);
  addText("======================================", 0, 1, 0);
  if (settings.receiptFooterMessage) {
    for (const line of settings.receiptFooterMessage.split("\n")) addText(line.trim(), 1, 1, 0);
  }
  addText(" ", 0, 1, 0);

  res.json(Object.fromEntries(printSequence.map((item, index) => [index.toString(), item])));
}

export async function changeInvoiceStatus(req, res) {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  const allowed = {
    draft: ["approved", "cancelled"],
    approved: ["sent", "cancelled"],
    sent: ["viewed", "cancelled"],
    viewed: ["cancelled"],
    paid: ["void"],
  };
  const { status, reason } = req.body;

  if (!allowed[invoice.status]?.includes(status)) {
    res.status(400);
    throw new Error(
      `Cannot change status from '${invoice.status}' to '${status}'`,
    );
  }

  invoice.status = status;
  invoice.updatedBy = req.user._id;
  if (status === "sent") invoice.sentAt = new Date();
  if (status === "cancelled") {
    invoice.cancelledBy = req.user._id;
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = reason;
    invoice.paymentStatus = "cancelled";
  }

  await invoice.save();
  await updateCustomerBalance(invoice.customerId);

  res.json({ success: true, data: invoice });
}

export async function deleteInvoice(req, res) {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  if (invoice.status !== "draft") {
    res.status(400);
    throw new Error("Only draft invoices can be deleted");
  }

  invoice.deletedAt = new Date();
  await invoice.save();

  res.json({ success: true, data: invoice });
}

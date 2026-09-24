import "server-only";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import "../models/User.js";

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

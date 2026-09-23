import "server-only";
import mongoose from "mongoose";
import BankAccount from "../models/BankAccount.js";
import Bill from "../models/Bill.js";
import Cheque from "../models/Cheque.js";
import Customer from "../models/Customer.js";
import Payment from "../models/Payment.js";
import Supplier from "../models/Supplier.js";
import "../models/User.js";

const bankMethods = new Set(["bank_transfer", "card", "mobile_wallet"]);

function missingParty(direction) {
  return direction === "received"
    ? "customerId required for received payments"
    : "supplierId required for paid payments";
}

async function populatePayment(id) {
  return Payment.findById(id)
    .populate("customerId", "displayName customerCode")
    .populate("supplierId", "displayName supplierCode")
    .populate("bankAccountId", "accountName bankName");
}

async function validateAndStampAllocations(allocations, session) {
  for (const allocation of allocations) {
    if (allocation.documentType === "invoice") {
      throw new Error(`Invoice ${allocation.documentId} not found`);
    }
    if (allocation.documentType === "bill") {
      const bill = await Bill.findById(allocation.documentId).session(session);
      if (!bill) throw new Error(`Bill ${allocation.documentId} not found`);
      if (allocation.amount > bill.balanceDue) {
        throw new Error(`Cannot allocate ${allocation.amount} to bill ${bill.billNumber}, balance is ${bill.balanceDue}`);
      }
      allocation.documentNumber = bill.billNumber;
    }
  }
}

async function applyBillAllocations(allocations, paymentDate, multiplier, session) {
  for (const allocation of allocations) {
    if (allocation.documentType !== "bill") continue;
    const bill = await Bill.findById(allocation.documentId).session(session);
    if (!bill) continue;
    bill.amountPaid = +(bill.amountPaid + multiplier * allocation.amount).toFixed(2);
    if (multiplier > 0) bill.lastPaymentDate = paymentDate;
    await bill.save({ session });
  }
}

async function updateBankAccount(bankAccountId, amountChange, session) {
  const account = await BankAccount.findById(bankAccountId).session(session);
  if (!account) return;
  account.currentBalance = +(account.currentBalance + amountChange).toFixed(2);
  await account.save({ session });
}

export async function createPayment(req, res) {
  const { direction, customerId, supplierId, allocations = [], ...rest } = req.body;
  if ((direction === "received" && !customerId) || (direction === "paid" && !supplierId)) {
    res.status(400);
    throw new Error(missingParty(direction));
  }

  const session = await mongoose.startSession();
  let payment;
  try {
    await session.withTransaction(async () => {
      await validateAndStampAllocations(allocations, session);
      const party = direction === "received"
        ? await Customer.findById(customerId).session(session)
        : await Supplier.findById(supplierId).session(session);
      payment = new Payment({
        direction,
        customerId: direction === "received" ? customerId : undefined,
        supplierId: direction === "paid" ? supplierId : undefined,
        partyName: party?.displayName,
        allocations,
        receivedBy: req.user._id,
        createdBy: req.user._id,
        ...rest,
      });
      await payment.save({ session });
      await applyBillAllocations(allocations, payment.paymentDate, 1, session);
      if (rest.method === "cheque") {
        await new Cheque({
          chequeNumber: rest.chequeNumber,
          chequeDate: rest.chequeDate,
          amount: rest.amount,
          bankName: rest.bankName,
          direction: direction === "received" ? "incoming" : "outgoing",
          payeeName: party?.displayName,
          paymentId: payment._id,
          customerId: direction === "received" ? customerId : undefined,
          supplierId: direction === "paid" ? supplierId : undefined,
          createdBy: req.user._id,
          status: "pending",
          notes: `Created from payment ${payment.paymentNumber}`,
        }).save({ session });
      }
      if (rest.bankAccountId && bankMethods.has(rest.method)) {
        await updateBankAccount(rest.bankAccountId, direction === "received" ? rest.amount : -rest.amount, session);
      }
    });
    res.status(201).json({ success: true, data: await populatePayment(payment._id) });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Failed to create payment");
  } finally {
    await session.endSession();
  }
}

export async function getPayments(req, res) {
  const { direction, customerId, supplierId, documentId, method, status, startDate, endDate, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (direction) filter.direction = direction;
  if (customerId) filter.customerId = customerId;
  if (supplierId) filter.supplierId = supplierId;
  if (documentId) filter["allocations.documentId"] = documentId;
  if (method) filter.method = method;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.paymentDate = {};
    if (startDate) filter.paymentDate.$gte = new Date(startDate);
    if (endDate) filter.paymentDate.$lte = new Date(endDate);
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter).populate("customerId", "displayName customerCode").populate("supplierId", "displayName supplierCode").populate("receivedBy", "firstName lastName").sort({ paymentDate: -1 }).skip(skip).limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);
  res.json({ success: true, count: payments.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: payments });
}

export async function getPaymentById(req, res) {
  const payment = await Payment.findById(req.params.id)
    .populate("customerId", "displayName customerCode")
    .populate("supplierId", "displayName supplierCode")
    .populate("receivedBy", "firstName lastName")
    .populate("bankAccountId", "accountName bankName")
    .populate("createdBy", "firstName lastName");
  if (!payment) { res.status(404); throw new Error("Payment not found"); }
  res.json({ success: true, data: payment });
}

export async function deletePayment(req, res) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(req.params.id).session(session);
      if (!payment) throw new Error("Payment not found");
      if (payment.deletedAt) throw new Error("Payment already deleted");
      await applyBillAllocations(payment.allocations, payment.paymentDate, -1, session);
      if (payment.bankAccountId) {
        await updateBankAccount(payment.bankAccountId, payment.direction === "received" ? -payment.amount : payment.amount, session);
      }
      if (payment.method === "cheque") {
        const cheque = await Cheque.findOne({ paymentId: payment._id }).session(session);
        if (cheque) {
          if (cheque.status === "cleared" && cheque.depositedBankAccountId) {
            await updateBankAccount(cheque.depositedBankAccountId, cheque.direction === "incoming" ? -cheque.amount : cheque.amount, session);
          }
          cheque.status = "cancelled";
          cheque.deletedAt = new Date();
          await cheque.save({ session });
        }
      }
      payment.deletedAt = new Date();
      payment.status = "cancelled";
      await payment.save({ session });
    });
    res.json({ success: true, message: "Payment deleted and effects reversed" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Failed to delete payment");
  } finally {
    await session.endSession();
  }
}

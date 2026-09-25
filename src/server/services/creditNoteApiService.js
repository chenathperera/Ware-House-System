import "server-only";
import mongoose from "mongoose";
import CreditNote from "../models/CreditNote.js";
import Customer from "../models/Customer.js";
import "../models/CustomerReturn.js";
import Invoice from "../models/Invoice.js";
import { updateCustomerBalance } from "./invoiceApiService.js";

export async function createCreditNote(req, res) {
  const { customerId, amount, reason, description, invoiceId } = req.body;
  const customer = await Customer.findById(customerId);
  if (!customer) { res.status(404); throw new Error("Customer not found"); }
  const creditNote = new CreditNote({ customerId: customer._id, customerSnapshot: { name: customer.displayName, code: customer.customerCode }, amount, reason: reason || "other", description, invoiceId, createdBy: req.user._id });
  await creditNote.save();
  await updateCustomerBalance(customer._id);
  res.status(201).json({ success: true, data: creditNote });
}

export async function getCreditNotes(req, res) {
  const { customerId, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [notes, total] = await Promise.all([
    CreditNote.find(filter).populate("customerId", "displayName customerCode").populate("customerReturnId", "rmaNumber").sort({ issueDate: -1 }).skip(skip).limit(Number(limit)),
    CreditNote.countDocuments(filter),
  ]);
  res.json({ success: true, count: notes.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: notes });
}

export async function getCreditNoteById(req, res) {
  const creditNote = await CreditNote.findById(req.params.id).populate("customerId", "displayName customerCode").populate("customerReturnId", "rmaNumber").populate("applications.invoiceId", "invoiceNumber").populate("applications.appliedBy", "firstName lastName").populate("createdBy", "firstName lastName");
  if (!creditNote) { res.status(404); throw new Error("Credit note not found"); }
  res.json({ success: true, data: creditNote });
}

export async function applyCreditNote(req, res) {
  const { invoiceId, amount } = req.body;
  const creditNote = await CreditNote.findById(req.params.id);
  if (!creditNote) { res.status(404); throw new Error("Credit note not found"); }
  if (["fully_applied", "cancelled"].includes(creditNote.status)) { res.status(400); throw new Error(`Credit note is ${creditNote.status}`); }
  if (amount > creditNote.remainingAmount) { res.status(400); throw new Error(`Cannot apply more than remaining (${creditNote.remainingAmount})`); }
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) { res.status(404); throw new Error("Invoice not found"); }
  if (invoice.customerId.toString() !== creditNote.customerId.toString()) { res.status(400); throw new Error("Credit note and invoice must be for the same customer"); }
  if (amount > invoice.balanceDue) { res.status(400); throw new Error(`Cannot apply more than invoice balance (${invoice.balanceDue})`); }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      creditNote.applications.push({ invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber, amountApplied: amount, appliedBy: req.user._id });
      await creditNote.save({ session });
      invoice.amountPaid = +(invoice.amountPaid + amount).toFixed(2);
      invoice.lastPaymentDate = new Date();
      await invoice.save({ session });
    });
    await updateCustomerBalance(creditNote.customerId);
    res.json({ success: true, message: "Credit applied to invoice", data: creditNote });
  } finally { session.endSession(); }
}

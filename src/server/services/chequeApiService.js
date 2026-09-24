import "server-only";
import BankAccount from "../models/BankAccount.js";
import Cheque from "../models/Cheque.js";

export async function createCheque(req, res) {
  const cheque = await Cheque.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: cheque });
}

export async function getCheques(req, res) {
  const { status, direction, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }
  if (direction) {
    filter.direction = direction;
  }
  if (search) {
    filter.$or = [
      { chequeNumber: { $regex: search, $options: "i" } },
      { bankName: { $regex: search, $options: "i" } },
      { payeeName: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [cheques, total] = await Promise.all([
    Cheque.find(filter)
      .sort({ chequeDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("customerId", "displayName")
      .populate("supplierId", "displayName")
      .populate("paymentId", "paymentNumber")
      .populate("depositedBankAccountId", "accountName"),
    Cheque.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: cheques,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
  });
}

export async function updateChequeStatus(req, res) {
  const { status, clearedDate, bouncedDate, bouncedReason } = req.body;
  const cheque = await Cheque.findById(req.params.id);

  if (!cheque) {
    res.status(404);
    throw new Error("Cheque not found");
  }

  const oldStatus = cheque.status;
  cheque.status = status;

  if (clearedDate) {
    cheque.clearedDate = clearedDate;
  }
  if (bouncedDate) {
    cheque.bouncedDate = bouncedDate;
  }
  if (bouncedReason) {
    cheque.bouncedReason = bouncedReason;
  }
  if (req.body.depositedBankAccountId) {
    cheque.depositedBankAccountId = req.body.depositedBankAccountId;
  }

  await cheque.save();

  if (
    status === "cleared" &&
    oldStatus !== "cleared" &&
    cheque.depositedBankAccountId
  ) {
    const bankAccount = await BankAccount.findById(
      cheque.depositedBankAccountId,
    );

    if (bankAccount) {
      const amountChange =
        cheque.direction === "incoming" ? cheque.amount : -cheque.amount;
      bankAccount.currentBalance = +(
        bankAccount.currentBalance + amountChange
      ).toFixed(2);
      await bankAccount.save();
    }
  }

  res.json({ success: true, data: cheque });
}

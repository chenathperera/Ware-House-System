import "server-only";
import mongoose from "mongoose";
import BankAccount from "../models/BankAccount.js";
import FundTransfer from "../models/FundTransfer.js";

export async function createFundTransfer(req, res) {
  const { fromBankAccountId, toBankAccountId, amount, ...rest } = req.body;

  if (fromBankAccountId === toBankAccountId) {
    res.status(400);
    throw new Error("Source and destination accounts must be different");
  }

  const session = await mongoose.startSession();
  let transfer;

  try {
    await session.withTransaction(async () => {
      const fromAccount = await BankAccount.findById(fromBankAccountId).session(session);
      const toAccount = await BankAccount.findById(toBankAccountId).session(session);

      if (!fromAccount || !toAccount) {
        throw new Error("One or both bank accounts not found");
      }

      if (fromAccount.currentBalance < amount) {
        throw new Error("Insufficient balance in source account");
      }

      fromAccount.currentBalance -= Number(amount);
      toAccount.currentBalance += Number(amount);

      await fromAccount.save({ session });
      await toAccount.save({ session });

      transfer = new FundTransfer({
        fromBankAccountId,
        toBankAccountId,
        amount,
        createdBy: req.user._id,
        ...rest,
      });

      await transfer.save({ session });
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  } finally {
    session.endSession();
  }
}

export async function getFundTransfers(_req, res) {
  const transfers = await FundTransfer.find()
    .populate("fromBankAccountId", "accountName bankName category")
    .populate("toBankAccountId", "accountName bankName category")
    .sort({ transferDate: -1 });

  res.json({ success: true, data: transfers });
}

export async function deleteFundTransfer(req, res) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const transfer = await FundTransfer.findById(req.params.id).session(session);

      if (!transfer) throw new Error("Transfer not found");
      if (transfer.deletedAt) throw new Error("Transfer already reversed");

      const fromAccount = await BankAccount.findById(transfer.fromBankAccountId).session(
        session,
      );
      const toAccount = await BankAccount.findById(transfer.toBankAccountId).session(session);

      if (fromAccount && toAccount) {
        fromAccount.currentBalance += transfer.amount;
        toAccount.currentBalance -= transfer.amount;

        await fromAccount.save({ session });
        await toAccount.save({ session });
      }

      transfer.deletedAt = new Date();
      await transfer.save({ session });
    });

    res.json({ success: true, message: "Transfer reversed" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  } finally {
    session.endSession();
  }
}

import "server-only";
import BankAccount from "../models/BankAccount.js";

export async function createBankAccount(req, res) {
  const account = await BankAccount.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: account });
}

export async function getBankAccounts(req, res) {
  const { category, isActive } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (isActive) filter.isActive = isActive === "true";

  const accounts = await BankAccount.find(filter).sort({ accountName: 1 });
  res.json({ success: true, data: accounts });
}

export async function getBankAccountById(req, res) {
  const account = await BankAccount.findById(req.params.id);
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }
  res.json({ success: true, data: account });
}

export async function updateBankAccount(req, res) {
  const account = await BankAccount.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }
  res.json({ success: true, data: account });
}

export async function deleteBankAccount(req, res) {
  const account = await BankAccount.findById(req.params.id);
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }

  await account.deleteOne();
  res.json({ success: true, message: "Account deleted" });
}

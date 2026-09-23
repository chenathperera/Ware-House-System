import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteBankAccount,
  getBankAccountById,
  updateBankAccount,
} from "../../../../server/services/bankAccountApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getBankAccountById, { auth: true });
export const PUT = apiHandler(updateBankAccount, { auth: true });
export const DELETE = apiHandler(deleteBankAccount, { auth: true });

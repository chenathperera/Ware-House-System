import { apiHandler } from "../../../server/http/handler.js";
import {
  createBankAccount,
  getBankAccounts,
} from "../../../server/services/bankAccountApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getBankAccounts, { auth: true });
export const POST = apiHandler(createBankAccount, { auth: true });

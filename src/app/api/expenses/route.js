import { apiHandler } from "../../../server/http/handler.js";
import {
  createExpense,
  getExpenses,
} from "../../../server/services/expenseApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getExpenses, { auth: true });
export const POST = apiHandler(createExpense, { auth: true });

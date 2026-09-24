import { apiHandler } from "../../../../server/http/handler.js";
import { getExpenseCategories } from "../../../../server/services/expenseApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getExpenseCategories, { auth: true });

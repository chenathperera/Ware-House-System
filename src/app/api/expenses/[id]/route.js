import { apiHandler } from "../../../../server/http/handler.js";
import { deleteExpense } from "../../../../server/services/expenseApiService.js";

export const runtime = "nodejs";

export const DELETE = apiHandler(deleteExpense, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});

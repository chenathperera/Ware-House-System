import { apiHandler } from "../../../../server/http/handler.js";
import { getProfitAndLoss } from "../../../../server/services/reportsApiService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getProfitAndLoss, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});

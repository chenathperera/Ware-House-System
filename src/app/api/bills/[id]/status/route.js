import { apiHandler } from "../../../../../server/http/handler.js";
import { changeBillStatus } from "../../../../../server/services/billApiService.js";

export const runtime = "nodejs";
export const PATCH = apiHandler(changeBillStatus, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});

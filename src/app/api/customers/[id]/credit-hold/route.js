import { apiHandler } from "../../../../../server/http/handler.js";
import { toggleCreditHold } from "../../../../../server/services/customerService.js";

export const runtime = "nodejs";
export const PATCH = apiHandler(toggleCreditHold, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});

import { apiHandler } from "../../../../../server/http/handler.js";
import { approveReturn } from "../../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(approveReturn, { auth: true, roles: ["admin", "manager", "sales_manager"] });

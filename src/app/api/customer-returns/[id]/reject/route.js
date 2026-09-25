import { apiHandler } from "../../../../../server/http/handler.js";
import { rejectReturn } from "../../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(rejectReturn, { auth: true, roles: ["admin", "manager", "sales_manager"] });

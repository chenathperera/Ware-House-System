import { apiHandler } from "../../../../../server/http/handler.js";
import { processReturn } from "../../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(processReturn, { auth: true, roles: ["admin", "manager", "warehouse_staff"] });

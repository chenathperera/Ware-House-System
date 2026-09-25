import { apiHandler } from "../../../../../server/http/handler.js";
import { receiveReturn } from "../../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(receiveReturn, { auth: true, roles: ["admin", "manager", "warehouse_staff"] });

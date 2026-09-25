import { apiHandler } from "../../../../../server/http/handler.js";
import { approveProductionOrder } from "../../../../../server/services/productionOrderApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(approveProductionOrder, { auth: true, roles: ["admin", "manager", "production_staff"] });

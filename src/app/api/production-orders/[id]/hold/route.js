import { apiHandler } from "../../../../../server/http/handler.js";
import { holdProductionOrder } from "../../../../../server/services/productionOrderApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(holdProductionOrder, { auth: true, roles: ["admin", "manager", "production_staff"] });

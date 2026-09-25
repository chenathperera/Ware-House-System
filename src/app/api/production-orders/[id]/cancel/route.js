import { apiHandler } from "../../../../../server/http/handler.js";
import { cancelProductionOrder } from "../../../../../server/services/productionOrderApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(cancelProductionOrder, { auth: true, roles: ["admin", "manager"] });

import { apiHandler } from "../../../../../server/http/handler.js";
import { completeProductionOrder } from "../../../../../server/services/productionOrderApiService.js";
import { completeProductionSchema } from "../../../../../server/validators/productionOrderValidator.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(completeProductionOrder, { auth: true, roles: ["admin", "manager", "production_staff"], schema: completeProductionSchema });

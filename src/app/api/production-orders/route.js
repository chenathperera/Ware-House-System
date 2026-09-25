import { apiHandler } from "../../../server/http/handler.js";
import { createProductionOrder, getProductionOrders } from "../../../server/services/productionOrderApiService.js";
import { createProductionOrderSchema } from "../../../server/validators/productionOrderValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getProductionOrders, { auth: true });
export const POST = apiHandler(createProductionOrder, { auth: true, roles: ["admin", "manager", "production_staff"], schema: createProductionOrderSchema });

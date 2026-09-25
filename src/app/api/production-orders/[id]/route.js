import { apiHandler } from "../../../../server/http/handler.js";
import { deleteProductionOrder, getProductionOrderById } from "../../../../server/services/productionOrderApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getProductionOrderById, { auth: true });
export const DELETE = apiHandler(deleteProductionOrder, { auth: true, roles: ["admin", "manager"] });

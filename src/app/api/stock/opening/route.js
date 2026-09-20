import { apiHandler } from "../../../../server/http/handler.js";
import { createOpeningStock } from "../../../../server/services/stockApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(createOpeningStock, { auth: true, roles: ["admin", "manager", "warehouse_staff"] });

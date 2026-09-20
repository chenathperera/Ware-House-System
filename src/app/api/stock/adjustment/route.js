import { apiHandler } from "../../../../server/http/handler.js";
import { adjustStock } from "../../../../server/services/stockApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(adjustStock, { auth: true, roles: ["admin", "manager", "warehouse_staff"] });

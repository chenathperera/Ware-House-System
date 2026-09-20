import { apiHandler } from "../../../../server/http/handler.js";
import { transferStock } from "../../../../server/services/stockApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(transferStock, { auth: true, roles: ["admin", "manager", "warehouse_staff"] });

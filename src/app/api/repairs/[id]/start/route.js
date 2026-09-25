import { apiHandler } from "../../../../../server/http/handler.js";
import { startRepair } from "../../../../../server/services/repairApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(startRepair, { auth: true, roles: ["admin", "manager", "warehouse_staff", "production_staff"] });

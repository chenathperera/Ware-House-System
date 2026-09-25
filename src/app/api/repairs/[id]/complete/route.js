import { apiHandler } from "../../../../../server/http/handler.js";
import { completeRepair } from "../../../../../server/services/repairApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(completeRepair, { auth: true, roles: ["admin", "manager", "warehouse_staff", "production_staff"] });

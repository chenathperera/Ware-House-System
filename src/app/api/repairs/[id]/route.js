import { apiHandler } from "../../../../server/http/handler.js";
import { getRepairById, updateRepair } from "../../../../server/services/repairApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getRepairById, { auth: true });
export const PUT = apiHandler(updateRepair, { auth: true, roles: ["admin", "manager", "warehouse_staff", "production_staff"] });

import { apiHandler } from "../../../server/http/handler.js";
import { createRepair, getRepairs } from "../../../server/services/repairApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getRepairs, { auth: true });
export const POST = apiHandler(createRepair, { auth: true, roles: ["admin", "manager", "warehouse_staff", "production_staff"] });

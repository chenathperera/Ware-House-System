import { apiHandler } from "../../../server/http/handler.js";
import { createDamage, getDamages } from "../../../server/services/damageApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getDamages, { auth: true });
export const POST = apiHandler(createDamage, { auth: true, roles: ["admin", "manager", "warehouse_staff", "production_staff"] });

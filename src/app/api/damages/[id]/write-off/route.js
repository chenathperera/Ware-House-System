import { apiHandler } from "../../../../../server/http/handler.js";
import { writeOffDamage } from "../../../../../server/services/damageApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(writeOffDamage, { auth: true, roles: ["admin", "manager"] });

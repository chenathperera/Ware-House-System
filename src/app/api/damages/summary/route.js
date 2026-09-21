import { apiHandler } from "../../../../server/http/handler.js";
import { getDamageSummary } from "../../../../server/services/damageApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getDamageSummary, { auth: true });

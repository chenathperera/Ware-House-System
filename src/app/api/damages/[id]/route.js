import { apiHandler } from "../../../../server/http/handler.js";
import { getDamageById } from "../../../../server/services/damageApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getDamageById, { auth: true });

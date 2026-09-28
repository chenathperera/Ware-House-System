import { apiHandler } from "../../../../server/http/handler.js";
import { getActivePosSession } from "../../../../server/services/posSessionApiService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getActivePosSession, { auth: true });

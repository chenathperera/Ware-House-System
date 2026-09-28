import { apiHandler } from "../../../../server/http/handler.js";
import { openPosSession } from "../../../../server/services/posSessionApiService.js";

export const runtime = "nodejs";
export const POST = apiHandler(openPosSession, { auth: true });

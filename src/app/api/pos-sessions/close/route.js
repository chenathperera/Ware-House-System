import { apiHandler } from "../../../../server/http/handler.js";
import { closePosSession } from "../../../../server/services/posSessionApiService.js";

export const runtime = "nodejs";
export const POST = apiHandler(closePosSession, { auth: true });

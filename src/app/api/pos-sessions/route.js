import { apiHandler } from "../../../server/http/handler.js";
import { getPosSessions } from "../../../server/services/posSessionApiService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getPosSessions, { auth: true });

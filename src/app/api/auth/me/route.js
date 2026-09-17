import { apiHandler } from "../../../../server/http/handler.js";
import { getMe } from "../../../../server/services/authService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getMe, { auth: true, authLimit: true });

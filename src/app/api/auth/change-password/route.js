import { apiHandler } from "../../../../server/http/handler.js";
import { changePassword } from "../../../../server/services/authService.js";

export const runtime = "nodejs";
export const POST = apiHandler(changePassword, { auth: true, authLimit: true });

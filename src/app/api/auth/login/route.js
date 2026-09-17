import { apiHandler } from "../../../../server/http/handler.js";
import { login } from "../../../../server/services/authService.js";
import { loginSchema } from "../../../../server/validators/authValidator.js";

export const runtime = "nodejs";
export const POST = apiHandler(login, { schema: loginSchema, authLimit: true });

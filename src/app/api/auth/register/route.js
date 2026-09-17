import { apiHandler } from "../../../../server/http/handler.js";
import { register } from "../../../../server/services/authService.js";
import { registerSchema } from "../../../../server/validators/authValidator.js";

export const runtime = "nodejs";
export const POST = apiHandler(register, {
  registration: true,
  schema: registerSchema,
  authLimit: true,
});

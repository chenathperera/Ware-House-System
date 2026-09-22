import { apiHandler } from "../../../../server/http/handler.js";
import { createFromGrn } from "../../../../server/services/billApiService.js";
import { createFromGrnSchema } from "../../../../server/validators/billValidator.js";

export const runtime = "nodejs";
export const POST = apiHandler(createFromGrn, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
  schema: createFromGrnSchema,
});

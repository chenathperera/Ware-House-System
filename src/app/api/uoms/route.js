import { apiHandler } from "../../../server/http/handler.js";
import { createUom, getUoms } from "../../../server/services/uomService.js";
import { createUomSchema } from "../../../server/validators/uomValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getUoms, { auth: true });
export const POST = apiHandler(createUom, {
  auth: true,
  roles: ["admin", "manager"],
  schema: createUomSchema,
});

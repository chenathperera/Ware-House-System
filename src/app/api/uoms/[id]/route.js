import { apiHandler } from "../../../../server/http/handler.js";
import { deleteUom, updateUom } from "../../../../server/services/uomService.js";
import { updateUomSchema } from "../../../../server/validators/uomValidator.js";

export const runtime = "nodejs";
export const PUT = apiHandler(updateUom, {
  auth: true,
  roles: ["admin", "manager"],
  schema: updateUomSchema,
});
export const DELETE = apiHandler(deleteUom, { auth: true, roles: ["admin", "manager"] });

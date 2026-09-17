import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteBrand,
  getBrandById,
  updateBrand,
} from "../../../../server/services/brandService.js";
import { updateBrandSchema } from "../../../../server/validators/brandValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getBrandById, { auth: true });
export const PUT = apiHandler(updateBrand, {
  auth: true,
  roles: ["admin", "manager"],
  schema: updateBrandSchema,
});
export const DELETE = apiHandler(deleteBrand, { auth: true, roles: ["admin", "manager"] });

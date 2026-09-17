import { apiHandler } from "../../../server/http/handler.js";
import { createBrand, getBrands } from "../../../server/services/brandService.js";
import { createBrandSchema } from "../../../server/validators/brandValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getBrands, { auth: true });
export const POST = apiHandler(createBrand, {
  auth: true,
  roles: ["admin", "manager"],
  schema: createBrandSchema,
});

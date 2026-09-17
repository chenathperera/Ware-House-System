import { apiHandler } from "../../../server/http/handler.js";
import {
  createProduct,
  getProducts,
} from "../../../server/services/productService.js";
import { createProductSchema } from "../../../server/validators/productValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getProducts, { auth: true });
export const POST = apiHandler(createProduct, {
  auth: true,
  roles: ["admin", "manager"],
  schema: createProductSchema,
});

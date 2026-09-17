import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteProduct,
  getProductById,
  updateProduct,
} from "../../../../server/services/productService.js";
import { updateProductSchema } from "../../../../server/validators/productValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getProductById, { auth: true });
export const PUT = apiHandler(updateProduct, {
  auth: true,
  roles: ["admin", "manager"],
  schema: updateProductSchema,
});
export const DELETE = apiHandler(deleteProduct, {
  auth: true,
  roles: ["admin", "manager"],
});

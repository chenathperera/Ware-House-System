import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteCategory,
  getCategoryById,
  updateCategory,
} from "../../../../server/services/categoryService.js";
import { updateCategorySchema } from "../../../../server/validators/categoryValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getCategoryById, { auth: true });
export const PUT = apiHandler(updateCategory, {
  auth: true,
  roles: ["admin", "manager"],
  schema: updateCategorySchema,
});
export const DELETE = apiHandler(deleteCategory, { auth: true, roles: ["admin", "manager"] });

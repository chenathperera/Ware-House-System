import { apiHandler } from "../../../server/http/handler.js";
import { createCategory, getCategories } from "../../../server/services/categoryService.js";
import { createCategorySchema } from "../../../server/validators/categoryValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getCategories, { auth: true });
export const POST = apiHandler(createCategory, {
  auth: true,
  roles: ["admin", "manager"],
  schema: createCategorySchema,
});

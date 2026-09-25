import { apiHandler } from "../../../../server/http/handler.js";
import { deleteBom, getBomById, updateBom } from "../../../../server/services/bomApiService.js";
import { updateBomSchema } from "../../../../server/validators/bomValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getBomById, { auth: true });
export const PUT = apiHandler(updateBom, { auth: true, roles: ["admin", "manager", "production_staff"], schema: updateBomSchema });
export const DELETE = apiHandler(deleteBom, { auth: true, roles: ["admin", "manager"] });

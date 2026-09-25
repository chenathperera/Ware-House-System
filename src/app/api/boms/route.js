import { apiHandler } from "../../../server/http/handler.js";
import { createBom, getBoms } from "../../../server/services/bomApiService.js";
import { createBomSchema } from "../../../server/validators/bomValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getBoms, { auth: true });
export const POST = apiHandler(createBom, { auth: true, roles: ["admin", "manager", "production_staff"], schema: createBomSchema });

import { apiHandler } from "../../../server/http/handler.js";
import { createGrn, getGrns } from "../../../server/services/grnApiService.js";
import { createGrnSchema } from "../../../server/validators/grnValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getGrns, { auth: true });
export const POST = apiHandler(createGrn, { auth: true, roles: ["admin", "manager", "warehouse_staff"], schema: createGrnSchema });

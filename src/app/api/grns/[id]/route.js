import { apiHandler } from "../../../../server/http/handler.js";
import { cancelGrn, getGrnById } from "../../../../server/services/grnApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getGrnById, { auth: true });
export const DELETE = apiHandler(cancelGrn, { auth: true, roles: ["admin", "manager"] });

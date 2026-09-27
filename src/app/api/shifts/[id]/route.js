import { apiHandler } from "../../../../server/http/handler.js";
import { deleteShift, updateShift } from "../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PUT = apiHandler(updateShift, { auth: true, roles: ["admin", "manager"] });
export const DELETE = apiHandler(deleteShift, { auth: true, roles: ["admin", "manager"] });

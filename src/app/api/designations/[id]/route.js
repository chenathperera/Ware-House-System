import { apiHandler } from "../../../../server/http/handler.js";
import { deleteDesignation, updateDesignation } from "../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PUT = apiHandler(updateDesignation, { auth: true, roles: ["admin", "manager"] });
export const DELETE = apiHandler(deleteDesignation, { auth: true, roles: ["admin", "manager"] });

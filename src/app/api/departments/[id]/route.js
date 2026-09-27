import { apiHandler } from "../../../../server/http/handler.js";
import { deleteDepartment, updateDepartment } from "../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PUT = apiHandler(updateDepartment, { auth: true, roles: ["admin", "manager"] });
export const DELETE = apiHandler(deleteDepartment, { auth: true, roles: ["admin", "manager"] });

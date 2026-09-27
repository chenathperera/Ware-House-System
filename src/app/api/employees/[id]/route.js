import { apiHandler } from "../../../../server/http/handler.js";
import { deleteEmployee, getEmployeeById, updateEmployee } from "../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getEmployeeById, { auth: true });
export const PUT = apiHandler(updateEmployee, { auth: true, roles: ["admin", "manager"] });
export const DELETE = apiHandler(deleteEmployee, { auth: true, roles: ["admin", "manager"] });

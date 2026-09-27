import { apiHandler } from "../../../server/http/handler.js";
import { createDepartment, getDepartments } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getDepartments, { auth: true });
export const POST = apiHandler(createDepartment, { auth: true, roles: ["admin", "manager"] });

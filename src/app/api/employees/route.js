import { apiHandler } from "../../../server/http/handler.js";
import { createEmployee, getEmployees } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getEmployees, { auth: true });
export const POST = apiHandler(createEmployee, { auth: true, roles: ["admin", "manager"] });

import { apiHandler } from "../../../../server/http/handler.js";
import { processPayroll } from "../../../../server/services/payrollApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(processPayroll, { auth: true, roles: ["admin", "manager", "accountant"] });

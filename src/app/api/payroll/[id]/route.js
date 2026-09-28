import { apiHandler } from "../../../../server/http/handler.js";
import { getPayrollById } from "../../../../server/services/payrollApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getPayrollById, { auth: true, roles: ["admin", "manager", "accountant"] });

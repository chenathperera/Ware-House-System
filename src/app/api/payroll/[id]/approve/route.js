import { apiHandler } from "../../../../../server/http/handler.js";
import { approvePayroll } from "../../../../../server/services/payrollApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(approvePayroll, { auth: true, roles: ["admin", "manager", "accountant"] });

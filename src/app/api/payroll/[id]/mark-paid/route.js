import { apiHandler } from "../../../../../server/http/handler.js";
import { markPayrollPaid } from "../../../../../server/services/payrollApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(markPayrollPaid, { auth: true, roles: ["admin", "manager", "accountant"] });

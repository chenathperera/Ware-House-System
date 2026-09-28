import { apiHandler } from "../../../../server/http/handler.js";
import { previewPayslip } from "../../../../server/services/payrollApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(previewPayslip, { auth: true, roles: ["admin", "manager", "accountant"] });

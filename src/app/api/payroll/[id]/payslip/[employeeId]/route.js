import { apiHandler } from "../../../../../../server/http/handler.js";
import { getEmployeePayslip } from "../../../../../../server/services/payrollApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getEmployeePayslip, { auth: true });

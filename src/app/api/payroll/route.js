import { apiHandler } from "../../../server/http/handler.js";
import { getPayrolls } from "../../../server/services/payrollApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getPayrolls, { auth: true, roles: ["admin", "manager", "accountant"] });

import { apiHandler } from "../../../../../server/http/handler.js";
import { approveLeaveRequest } from "../../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(approveLeaveRequest, { auth: true, roles: ["admin", "manager"] });

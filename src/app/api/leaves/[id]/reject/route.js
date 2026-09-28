import { apiHandler } from "../../../../../server/http/handler.js";
import { rejectLeaveRequest } from "../../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(rejectLeaveRequest, { auth: true, roles: ["admin", "manager"] });

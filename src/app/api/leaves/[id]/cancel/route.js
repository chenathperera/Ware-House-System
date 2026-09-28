import { apiHandler } from "../../../../../server/http/handler.js";
import { cancelLeaveRequest } from "../../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(cancelLeaveRequest, { auth: true });

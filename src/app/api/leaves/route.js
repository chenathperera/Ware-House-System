import { apiHandler } from "../../../server/http/handler.js";
import { createLeaveRequest, getLeaveRequests } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getLeaveRequests, { auth: true });
export const POST = apiHandler(createLeaveRequest, { auth: true });

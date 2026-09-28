import { apiHandler } from "../../../server/http/handler.js";
import { getAttendance, markAttendance } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getAttendance, { auth: true });
export const POST = apiHandler(markAttendance, { auth: true, roles: ["admin", "manager"] });

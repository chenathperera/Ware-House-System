import { apiHandler } from "../../../../server/http/handler.js";
import { bulkMarkAttendance } from "../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(bulkMarkAttendance, { auth: true, roles: ["admin", "manager"] });

import { apiHandler } from "../../../../server/http/handler.js";
import { deleteHoliday, updateHoliday } from "../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PUT = apiHandler(updateHoliday, { auth: true, roles: ["admin", "manager"] });
export const DELETE = apiHandler(deleteHoliday, { auth: true, roles: ["admin", "manager"] });

import { apiHandler } from "../../../server/http/handler.js";
import { createHoliday, getHolidays } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getHolidays, { auth: true });
export const POST = apiHandler(createHoliday, { auth: true, roles: ["admin", "manager"] });

import { apiHandler } from "../../../server/http/handler.js";
import { createShift, getShifts } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getShifts, { auth: true });
export const POST = apiHandler(createShift, { auth: true, roles: ["admin", "manager"] });

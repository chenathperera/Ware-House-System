import { apiHandler } from "../../../../server/http/handler.js";
import { getReservations } from "../../../../server/services/stockApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getReservations, { auth: true });

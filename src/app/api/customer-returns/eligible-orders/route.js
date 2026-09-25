import { apiHandler } from "../../../../server/http/handler.js";
import { getEligibleOrders } from "../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getEligibleOrders, { auth: true });

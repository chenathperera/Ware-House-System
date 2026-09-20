import { apiHandler } from "../../../server/http/handler.js";
import { getStockItems } from "../../../server/services/stockApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getStockItems, { auth: true });

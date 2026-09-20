import { apiHandler } from "../../../../../server/http/handler.js";
import { getStockByProduct } from "../../../../../server/services/stockApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getStockByProduct, { auth: true });

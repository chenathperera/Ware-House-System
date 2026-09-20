import { apiHandler } from "../../../../server/http/handler.js";
import { getStockMovements } from "../../../../server/services/stockApiService.js";
export const runtime = "nodejs"; export const GET = apiHandler(getStockMovements, { auth: true });

import { apiHandler } from "../../../../server/http/handler.js";
import { getBillById } from "../../../../server/services/billApiService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getBillById, { auth: true });

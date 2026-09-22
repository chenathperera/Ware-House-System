import { apiHandler } from "../../../../../server/http/handler.js";
import { getPayablesAging } from "../../../../../server/services/billApiService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getPayablesAging, { auth: true });

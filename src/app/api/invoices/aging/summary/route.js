import { apiHandler } from "../../../../../server/http/handler.js";
import { getReceivablesAging } from "../../../../../server/services/invoiceApiService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getReceivablesAging, { auth: true });

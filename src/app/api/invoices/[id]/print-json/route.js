import { apiHandler } from "../../../../../server/http/handler.js";
import { getInvoicePrintJson } from "../../../../../server/services/invoiceApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getInvoicePrintJson);

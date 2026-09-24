import { apiHandler } from "../../../../../server/http/handler.js";
import { updateChequeStatus } from "../../../../../server/services/chequeApiService.js";

export const runtime = "nodejs";

export const PUT = apiHandler(updateChequeStatus, { auth: true });

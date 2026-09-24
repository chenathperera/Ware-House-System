import { apiHandler } from "../../../../server/http/handler.js";
import { deleteFundTransfer } from "../../../../server/services/fundTransferApiService.js";

export const runtime = "nodejs";

export const DELETE = apiHandler(deleteFundTransfer, { auth: true });

import { apiHandler } from "../../../server/http/handler.js";
import {
  createFundTransfer,
  getFundTransfers,
} from "../../../server/services/fundTransferApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getFundTransfers, { auth: true });
export const POST = apiHandler(createFundTransfer, { auth: true });

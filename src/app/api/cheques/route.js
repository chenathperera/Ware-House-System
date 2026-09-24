import { apiHandler } from "../../../server/http/handler.js";
import {
  createCheque,
  getCheques,
} from "../../../server/services/chequeApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getCheques, { auth: true });
export const POST = apiHandler(createCheque, { auth: true });

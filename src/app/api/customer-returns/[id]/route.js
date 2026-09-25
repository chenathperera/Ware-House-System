import { apiHandler } from "../../../../server/http/handler.js";
import { getReturnById } from "../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getReturnById, { auth: true });

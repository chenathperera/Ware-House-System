import { apiHandler } from "../../../server/http/handler.js";
import { createReturn, getReturns } from "../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getReturns, { auth: true });
export const POST = apiHandler(createReturn, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep", "accountant"] });

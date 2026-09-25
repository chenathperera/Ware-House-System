import { apiHandler } from "../../../../../server/http/handler.js";
import { completeReturn } from "../../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(completeReturn, { auth: true, roles: ["admin", "manager", "accountant"] });

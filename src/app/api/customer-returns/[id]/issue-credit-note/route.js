import { apiHandler } from "../../../../../server/http/handler.js";
import { issueCreditNote } from "../../../../../server/services/customerReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(issueCreditNote, { auth: true, roles: ["admin", "manager", "accountant"] });

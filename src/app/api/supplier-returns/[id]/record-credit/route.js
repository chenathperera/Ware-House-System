import { apiHandler } from "../../../../../server/http/handler.js";
import { recordSupplierCredit } from "../../../../../server/services/supplierReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(recordSupplierCredit, { auth: true, roles: ["admin", "manager", "accountant"] });

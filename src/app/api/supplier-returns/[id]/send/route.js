import { apiHandler } from "../../../../../server/http/handler.js";
import { sendSupplierReturn } from "../../../../../server/services/supplierReturnApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(sendSupplierReturn, { auth: true, roles: ["admin", "manager", "warehouse_staff"] });

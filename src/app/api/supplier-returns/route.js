import { apiHandler } from "../../../server/http/handler.js";
import { createSupplierReturn, getSupplierReturns } from "../../../server/services/supplierReturnApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getSupplierReturns, { auth: true });
export const POST = apiHandler(createSupplierReturn, { auth: true, roles: ["admin", "manager", "accountant", "warehouse_staff"] });

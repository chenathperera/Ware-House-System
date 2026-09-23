import { apiHandler } from "../../../../server/http/handler.js";
import { getSupplierReturnById } from "../../../../server/services/supplierReturnApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getSupplierReturnById, { auth: true });

import { apiHandler } from "../../../server/http/handler.js";
import { createPurchaseOrder, getPurchaseOrders } from "../../../server/services/purchaseOrderApiService.js";
import { createPurchaseOrderSchema } from "../../../server/validators/purchaseOrderValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getPurchaseOrders, { auth: true });
export const POST = apiHandler(createPurchaseOrder, { auth: true, roles: ["admin", "manager", "accountant"], schema: createPurchaseOrderSchema });

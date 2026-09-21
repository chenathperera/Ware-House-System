import { apiHandler } from "../../../../server/http/handler.js";
import { deletePurchaseOrder, getPurchaseOrderById, updatePurchaseOrder } from "../../../../server/services/purchaseOrderApiService.js";
import { updatePurchaseOrderSchema } from "../../../../server/validators/purchaseOrderValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getPurchaseOrderById, { auth: true });
export const PUT = apiHandler(updatePurchaseOrder, { auth: true, roles: ["admin", "manager", "accountant"], schema: updatePurchaseOrderSchema });
export const DELETE = apiHandler(deletePurchaseOrder, { auth: true, roles: ["admin", "manager"] });

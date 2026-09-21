import { apiHandler } from "../../../../../server/http/handler.js";
import { changePurchaseOrderStatus } from "../../../../../server/services/purchaseOrderApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(changePurchaseOrderStatus, { auth: true, roles: ["admin", "manager", "accountant"] });

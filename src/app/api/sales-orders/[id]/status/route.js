import { apiHandler } from "../../../../../server/http/handler.js";
import { changeSalesOrderStatus } from "../../../../../server/services/salesOrderApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(changeSalesOrderStatus, { auth: true, roles: ["admin", "manager", "sales_manager", "accountant", "warehouse_staff"] });

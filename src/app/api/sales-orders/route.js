import { apiHandler } from "../../../server/http/handler.js";
import { createSalesOrder, getSalesOrders } from "../../../server/services/salesOrderApiService.js";
import { createSalesOrderSchema } from "../../../server/validators/salesOrderValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getSalesOrders, { auth: true });
export const POST = apiHandler(createSalesOrder, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep"], schema: createSalesOrderSchema });

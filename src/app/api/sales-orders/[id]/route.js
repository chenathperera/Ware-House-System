import { apiHandler } from "../../../../server/http/handler.js";
import { deleteSalesOrder, getSalesOrderById, updateSalesOrder } from "../../../../server/services/salesOrderApiService.js";
import { updateSalesOrderSchema } from "../../../../server/validators/salesOrderValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getSalesOrderById, { auth: true });
export const PUT = apiHandler(updateSalesOrder, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep"], schema: updateSalesOrderSchema });
export const DELETE = apiHandler(deleteSalesOrder, { auth: true, roles: ["admin", "manager", "sales_manager"] });

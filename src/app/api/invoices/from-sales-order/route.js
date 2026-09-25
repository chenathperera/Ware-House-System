import { apiHandler } from "../../../../server/http/handler.js";
import { createInvoiceFromSalesOrder } from "../../../../server/services/invoiceApiService.js";
import { createFromSalesOrderSchema } from "../../../../server/validators/invoiceValidator.js";
export const runtime = "nodejs";
export const POST = apiHandler(createInvoiceFromSalesOrder, { auth: true, roles: ["admin", "manager", "accountant", "sales_manager"], schema: createFromSalesOrderSchema });

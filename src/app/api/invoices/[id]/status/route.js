import { apiHandler } from "../../../../../server/http/handler.js";
import {
  changeInvoiceStatus,
} from "../../../../../server/services/invoiceApiService.js";

export const runtime = "nodejs";

export const PATCH = apiHandler(changeInvoiceStatus, {
  auth: true,
  roles: ["admin", "manager", "accountant", "sales_manager"],
});

import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteInvoice,
  getInvoiceById,
} from "../../../../server/services/invoiceApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getInvoiceById, { auth: true });
export const DELETE = apiHandler(deleteInvoice, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});

import { apiHandler } from "../../../server/http/handler.js";
import { createInvoice, getInvoices } from "../../../server/services/invoiceApiService.js";
import { createInvoiceSchema } from "../../../server/validators/invoiceValidator.js";

export const runtime = "nodejs";

export const GET = apiHandler(getInvoices, { auth: true });
export const POST = apiHandler(createInvoice, {
  auth: true,
  roles: ["admin", "manager", "accountant", "sales_manager"],
  schema: createInvoiceSchema,
});

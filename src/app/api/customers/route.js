import { apiHandler } from "../../../server/http/handler.js";
import {
  createCustomer,
  getCustomers,
} from "../../../server/services/customerService.js";
import { createCustomerSchema } from "../../../server/validators/customerValidator.js";

export const runtime = "nodejs";

export const GET = apiHandler(getCustomers, { auth: true });
export const POST = apiHandler(createCustomer, {
  auth: true,
  roles: ["admin", "manager", "sales_manager", "sales_rep"],
  schema: createCustomerSchema,
});

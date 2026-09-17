import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteCustomer,
  getCustomerById,
  updateCustomer,
} from "../../../../server/services/customerService.js";
import { updateCustomerSchema } from "../../../../server/validators/customerValidator.js";

export const runtime = "nodejs";

export const GET = apiHandler(getCustomerById, { auth: true });
export const PUT = apiHandler(updateCustomer, {
  auth: true,
  roles: ["admin", "manager", "sales_manager", "sales_rep"],
  schema: updateCustomerSchema,
});
export const DELETE = apiHandler(deleteCustomer, {
  auth: true,
  roles: ["admin", "manager"],
});

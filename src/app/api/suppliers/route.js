import { apiHandler } from "../../../server/http/handler.js";
import {
  createSupplier,
  getSuppliers,
} from "../../../server/services/supplierService.js";
import { createSupplierSchema } from "../../../server/validators/supplierValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getSuppliers, { auth: true });
export const POST = apiHandler(createSupplier, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
  schema: createSupplierSchema,
});

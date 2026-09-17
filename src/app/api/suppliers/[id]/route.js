import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteSupplier,
  getSupplierById,
  updateSupplier,
} from "../../../../server/services/supplierService.js";
import { updateSupplierSchema } from "../../../../server/validators/supplierValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getSupplierById, { auth: true });
export const PUT = apiHandler(updateSupplier, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
  schema: updateSupplierSchema,
});
export const DELETE = apiHandler(deleteSupplier, {
  auth: true,
  roles: ["admin", "manager"],
});

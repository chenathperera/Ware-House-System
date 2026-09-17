import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteWarehouse,
  getWarehouseById,
  updateWarehouse,
} from "../../../../server/services/warehouseService.js";
import { updateWarehouseSchema } from "../../../../server/validators/warehouseValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getWarehouseById, { auth: true });
export const PUT = apiHandler(updateWarehouse, {
  auth: true,
  roles: ["admin", "manager"],
  schema: updateWarehouseSchema,
});
export const DELETE = apiHandler(deleteWarehouse, { auth: true, roles: ["admin", "manager"] });

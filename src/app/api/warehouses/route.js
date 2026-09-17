import { apiHandler } from "../../../server/http/handler.js";
import { createWarehouse, getWarehouses } from "../../../server/services/warehouseService.js";
import { createWarehouseSchema } from "../../../server/validators/warehouseValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getWarehouses, { auth: true });
export const POST = apiHandler(createWarehouse, {
  auth: true,
  roles: ["admin", "manager"],
  schema: createWarehouseSchema,
});

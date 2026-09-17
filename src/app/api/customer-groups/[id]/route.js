import { apiHandler } from "../../../../server/http/handler.js";
import { deleteCustomerGroup, getCustomerGroupById, updateCustomerGroup } from "../../../../server/services/customerGroupService.js";
import { updateCustomerGroupSchema } from "../../../../server/validators/customerGroupValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getCustomerGroupById, { auth: true });
export const PUT = apiHandler(updateCustomerGroup, { auth: true, roles: ["admin", "manager"], schema: updateCustomerGroupSchema });
export const DELETE = apiHandler(deleteCustomerGroup, { auth: true, roles: ["admin", "manager"] });

import { apiHandler } from "../../../server/http/handler.js";
import { createCustomerGroup, getCustomerGroups } from "../../../server/services/customerGroupService.js";
import { createCustomerGroupSchema } from "../../../server/validators/customerGroupValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getCustomerGroups, { auth: true });
export const POST = apiHandler(createCustomerGroup, { auth: true, roles: ["admin", "manager"], schema: createCustomerGroupSchema });

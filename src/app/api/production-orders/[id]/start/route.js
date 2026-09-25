import { apiHandler } from "../../../../../server/http/handler.js";
import { startProductionOrder } from "../../../../../server/services/productionOrderApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(startProductionOrder, { auth: true, roles: ["admin", "manager", "production_staff"] });

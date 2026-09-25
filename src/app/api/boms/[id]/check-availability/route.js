import { apiHandler } from "../../../../../server/http/handler.js";
import { checkMaterialAvailability } from "../../../../../server/services/bomApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(checkMaterialAvailability, { auth: true });

import { apiHandler } from "../../../server/http/handler.js";
import { createDesignation, getDesignations } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getDesignations, { auth: true });
export const POST = apiHandler(createDesignation, { auth: true, roles: ["admin", "manager"] });

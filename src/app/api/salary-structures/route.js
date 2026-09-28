import { apiHandler } from "../../../server/http/handler.js";
import { createSalaryStructure, getSalaryStructures } from "../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getSalaryStructures, { auth: true });
export const POST = apiHandler(createSalaryStructure, { auth: true, roles: ["admin", "manager"] });

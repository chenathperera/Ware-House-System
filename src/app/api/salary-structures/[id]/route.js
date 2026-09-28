import { apiHandler } from "../../../../server/http/handler.js";
import { deleteSalaryStructure, updateSalaryStructure } from "../../../../server/services/hrApiService.js";
export const runtime = "nodejs";
export const PUT = apiHandler(updateSalaryStructure, { auth: true, roles: ["admin", "manager"] });
export const DELETE = apiHandler(deleteSalaryStructure, { auth: true, roles: ["admin", "manager"] });

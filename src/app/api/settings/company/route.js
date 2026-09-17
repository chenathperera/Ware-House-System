import { apiHandler } from "../../../../server/http/handler.js";
import {
  getCompanySettings,
  updateCompanySettings,
} from "../../../../server/services/settingsService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getCompanySettings, { auth: true });
export const PUT = apiHandler(updateCompanySettings, { auth: true, roles: ["admin", "manager"] });

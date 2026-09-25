import { apiHandler } from "../../../../../server/http/handler.js";
import { applyCreditNote } from "../../../../../server/services/creditNoteApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(applyCreditNote, { auth: true, roles: ["admin", "manager", "accountant"] });

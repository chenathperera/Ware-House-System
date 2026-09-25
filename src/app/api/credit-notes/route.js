import { apiHandler } from "../../../server/http/handler.js";
import { createCreditNote, getCreditNotes } from "../../../server/services/creditNoteApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getCreditNotes, { auth: true });
export const POST = apiHandler(createCreditNote, { auth: true, roles: ["admin", "manager", "accountant"] });

import { apiHandler } from "../../../../server/http/handler.js";
import { getCreditNoteById } from "../../../../server/services/creditNoteApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getCreditNoteById, { auth: true });

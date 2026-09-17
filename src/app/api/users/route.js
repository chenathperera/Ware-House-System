import { apiHandler } from "../../../server/http/handler.js";
import { getUsers } from "../../../server/services/userService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getUsers, { auth: true });

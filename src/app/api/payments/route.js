import { apiHandler } from "../../../server/http/handler.js";
import { createPayment, getPayments } from "../../../server/services/paymentApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getPayments, { auth: true });
export const POST = apiHandler(createPayment, { auth: true, roles: ["admin", "manager", "accountant"] });

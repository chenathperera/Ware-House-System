import { apiHandler } from "../../../../server/http/handler.js";
import { deletePayment, getPaymentById } from "../../../../server/services/paymentApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getPaymentById, { auth: true });
export const DELETE = apiHandler(deletePayment, { auth: true, roles: ["admin", "manager", "accountant"] });

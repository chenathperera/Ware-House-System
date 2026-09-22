import { apiHandler } from "../../../server/http/handler.js";
import { createBill, getBills } from "../../../server/services/billApiService.js";
import { createBillSchema } from "../../../server/validators/billValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getBills, { auth: true });
export const POST = apiHandler(createBill, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
  schema: createBillSchema,
});

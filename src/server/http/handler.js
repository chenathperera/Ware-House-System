import "server-only";
import { connectMongoDB } from "../db/mongoose.js";
import User from "../models/User.js";
import { protect, authorize } from "../auth/guards.js";
import { limitAuth } from "../auth/rateLimit.js";
import { createResponse, errorResponse } from "./response.js";
import { readBody, validate } from "./body.js";

export function apiHandler(
  service,
  { auth = false, registration = false, roles, schema, authLimit = false } = {},
) {
  return async (request, context = {}) => {
    const res = createResponse();
    try {
      const url = new URL(request.url);
      const req = {
        headers: Object.fromEntries(request.headers),
        method: request.method,
        query: Object.fromEntries(
          [...url.searchParams.keys()].map((key) => {
            const values = url.searchParams.getAll(key);
            return [key, values.length > 1 ? values : values[0]];
          }),
        ),
        params: (await context.params) ?? {},
        body: await readBody(request),
      };
      if (authLimit && (await limitAuth(req, res))) return res.response;
      await connectMongoDB();
      if (registration) {
        if ((await User.countDocuments()) !== 0) {
          // The original route runs protect before validation and the controller
          // whenever the system already has a user. Authentication failures
          // therefore terminate registration instead of being reinterpreted by
          // the controller as a missing-user error.
          await protect(req, res);
        }
      } else if (auth) await protect(req, res);
      if (roles) authorize(req, res, ...roles);
      if (schema) validate(schema, req, res);
      await service(req, res);
      return res.response;
    } catch (error) {
      return errorResponse(error, res);
    }
  };
}

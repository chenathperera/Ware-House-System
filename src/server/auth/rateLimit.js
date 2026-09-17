import "server-only";
import { rateLimit } from "express-rate-limit";
import { getPeerAddress } from "../http/peer.js";

// One process-local limiter shared by all auth Route Handlers and hot reloads.
const limiter = (globalThis.__warehouseAuthLimiter ??= rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  // Next adds forwarding headers; the actual peer is captured independently.
  validate: { xForwardedForHeader: false, forwardedHeader: false },
}));

export async function limitAuth(req, res) {
  req.ip = getPeerAddress();
  req.app = { get: () => false }; // Express default: no trusted proxy.
  let failure;
  await limiter(req, res, (error) => {
    failure = error;
  });
  if (failure) throw failure;
  return res.response;
}

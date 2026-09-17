import "server-only";
import qs from "qs";

export async function readBody(request) {
  const type = request.headers.get("content-type")?.split(";")[0].trim();
  if (type !== "application/json" && type !== "application/x-www-form-urlencoded") return undefined;
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 10 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("request entity too large");
    }
    chunks.push(Buffer.from(value));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  if (type === "application/x-www-form-urlencoded") {
    if (text.split("&").length > 1000) throw new Error("too many parameters");
    return qs.parse(text, { depth: 32, strictDepth: true, allowPrototypes: true, arrayLimit: 100 });
  }
  const parsed = JSON.parse(text);
  if (parsed === null || typeof parsed !== "object")
    throw new SyntaxError("Unexpected token in JSON body");
  return parsed;
}

export function validate(schema, req, res) {
  try {
    req.body = schema.parse(req.body);
  } catch (error) {
    // Deliberately keep the original Zod v4 errors/issues mismatch.
    const messages =
      error.errors?.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ") ||
      "Validation failed";
    res.status(400);
    throw new Error(messages);
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  return process.env.TEACHER_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "diriyah-lesson-secret";
}

export function signToken() {
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ r: "teacher", exp })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !String(token).includes(".")) return false;
  const [body, sig] = String(token).split(".");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload?.r === "teacher" && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

export function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  return String(h).replace(/^Bearer\s+/i, "").trim();
}

export function pinsMatch(input) {
  const expected = process.env.TEACHER_PIN || "";
  if (!expected) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

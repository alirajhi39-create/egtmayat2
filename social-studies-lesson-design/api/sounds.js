import { ensureSchema, getSql } from "../lib/db.js";
import { bearer, readBody, verifyToken } from "../lib/auth.js";

const ALLOWED = new Set([
  "click",
  "flip",
  "correct",
  "wrong",
  "success",
  "reveal",
  "narr-0",
  "narr-1",
  "narr-2",
  "narr-3",
  "narr-4",
  "narr-5",
  "narr-6",
  "narr-7",
  "narr-8",
  "narr-9",
  "narr-10",
  "narr-11",
  "narr-12",
  "narr-13",
  "narr-finale",
]);

export const config = {
  api: { bodyParser: { sizeLimit: "3mb" } },
};

function authed(req) {
  return Boolean(process.env.TEACHER_PIN) && verifyToken(bearer(req));
}

export default async function handler(req, res) {
  const sql = getSql();
  if (!sql) return res.status(503).json({ error: "NO_DATABASE_URL" });
  try {
    await ensureSchema(sql);
  } catch (e) {
    return res.status(500).json({ error: "SCHEMA", message: String(e?.message || e) });
  }

  if (req.method === "GET") {
    const key = req.query?.key ? String(req.query.key) : "";
    if (key) {
      if (!ALLOWED.has(key)) return res.status(400).json({ error: "BAD_KEY" });
      const rows = await sql`SELECT sound_key, filename, mime, data, updated_at FROM sounds WHERE sound_key = ${key} LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: "NOT_FOUND" });
      const row = rows[0];
      return res.status(200).json({
        key: row.sound_key,
        filename: row.filename,
        mime: row.mime,
        data: row.data,
        updatedAt: row.updated_at,
      });
    }
    const rows = await sql`SELECT sound_key, filename, mime, updated_at, octet_length(data) AS size FROM sounds ORDER BY sound_key`;
    return res.status(200).json({
      sounds: rows.map((r) => ({
        key: r.sound_key,
        filename: r.filename,
        mime: r.mime,
        size: Number(r.size || 0),
        updatedAt: r.updated_at,
      })),
    });
  }

  if (req.method === "POST") {
    if (!authed(req)) return res.status(401).json({ error: "UNAUTHORIZED" });
    const body = readBody(req);
    const key = String(body.key || "");
    if (!ALLOWED.has(key)) return res.status(400).json({ error: "BAD_KEY" });
    const data = String(body.data || "");
    if (!data || data.length > 2_200_000) return res.status(413).json({ error: "TOO_LARGE", message: "الحد الأقصى 1.5 ميغابايت للملف" });
    const filename = String(body.filename || `${key}.mp3`).slice(0, 120);
    const mime = String(body.mime || "audio/mpeg").slice(0, 80);
    await sql`INSERT INTO sounds (sound_key, filename, mime, data, updated_at)
      VALUES (${key}, ${filename}, ${mime}, ${data}, NOW())
      ON CONFLICT (sound_key) DO UPDATE SET filename = EXCLUDED.filename, mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = NOW()`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!authed(req)) return res.status(401).json({ error: "UNAUTHORIZED" });
    const key = String(req.query?.key || readBody(req).key || "");
    if (!ALLOWED.has(key)) return res.status(400).json({ error: "BAD_KEY" });
    await sql`DELETE FROM sounds WHERE sound_key = ${key}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "METHOD" });
}

import { ensureSchema, getSql, mapStudent } from "../lib/db.js";
import { bearer, pinsMatch, readBody, signToken, verifyToken } from "../lib/auth.js";

function guard(req, res) {
  if (!process.env.TEACHER_PIN) {
    res.status(403).json({ error: "PIN_NOT_CONFIGURED", message: "عيّن المتغير TEACHER_PIN في إعدادات Vercel" });
    return false;
  }
  if (!verifyToken(bearer(req))) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  const sql = getSql();
  if (!sql) return res.status(503).json({ error: "NO_DATABASE_URL" });
  try {
    await ensureSchema(sql);
  } catch (e) {
    return res.status(500).json({ error: "SCHEMA", message: String(e?.message || e) });
  }

  if (req.method === "POST") {
    const body = readBody(req);
    if (body.action === "login") {
      if (!process.env.TEACHER_PIN) {
        return res.status(403).json({ error: "PIN_NOT_CONFIGURED", message: "عيّن TEACHER_PIN في Vercel ثم أعد النشر" });
      }
      if (!pinsMatch(body.pin || "")) return res.status(401).json({ error: "BAD_PIN", message: "رمز المعلم غير صحيح" });
      return res.status(200).json({ ok: true, token: signToken() });
    }
    if (!guard(req, res)) return;
    if (body.action === "delete") {
      const id = String(body.id || "");
      if (!id) return res.status(400).json({ error: "MISSING_ID" });
      await sql`DELETE FROM responses WHERE student_id = ${id}`;
      await sql`DELETE FROM students WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }
    if (body.action === "reset") {
      await sql`DELETE FROM responses`;
      await sql`DELETE FROM students`;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "BAD_ACTION" });
  }

  if (req.method === "GET") {
    if (!guard(req, res)) return;
    const id = req.query?.id ? String(req.query.id) : "";
    if (id) {
      const rows = await sql`SELECT * FROM students WHERE id = ${id} LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: "NOT_FOUND" });
      const ans = await sql`SELECT answer_key, value FROM responses WHERE student_id = ${id}`;
      const answers = {};
      for (const a of ans) answers[a.answer_key] = a.value ?? "";
      return res.status(200).json({ student: mapStudent(rows[0], answers) });
    }
    const students = await sql`SELECT * FROM students ORDER BY updated_at DESC LIMIT 500`;
    const responses = await sql`SELECT student_id, answer_key, value FROM responses`;
    const byStudent = {};
    for (const r of responses) {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = {};
      byStudent[r.student_id][r.answer_key] = r.value ?? "";
    }
    return res.status(200).json({
      students: students.map((row) => mapStudent(row, byStudent[row.id] || {})),
    });
  }

  return res.status(405).json({ error: "METHOD" });
}

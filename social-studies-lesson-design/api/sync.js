import { ensureSchema, getSql, mapStudent } from "../lib/db.js";
import { readBody } from "../lib/auth.js";

export default async function handler(req, res) {
  const sql = getSql();
  if (!sql) return res.status(503).json({ error: "NO_DATABASE_URL" });
  try {
    await ensureSchema(sql);
  } catch (e) {
    return res.status(500).json({ error: "SCHEMA", message: String(e?.message || e) });
  }

  if (req.method === "GET") {
    const id = String(req.query?.id || "");
    if (!id) return res.status(400).json({ error: "MISSING_ID" });
    const rows = await sql`SELECT * FROM students WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: "NOT_FOUND" });
    const ans = await sql`SELECT answer_key, value FROM responses WHERE student_id = ${id}`;
    const answers = {};
    for (const a of ans) answers[a.answer_key] = a.value ?? "";
    return res.status(200).json({ student: mapStudent(rows[0], answers) });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "METHOD" });
  const body = readBody(req);

  if (body.type === "progress") {
    const s = body.student || {};
    if (!s.id || !s.name) return res.status(400).json({ error: "BAD_STUDENT" });
    const name = String(s.name).slice(0, 60);
    const className = String(s.className || "").slice(0, 40);
    const currentSlide = Number(s.currentSlide) || 0;
    const maxSlide = Number(s.maxSlide) || 0;
    const visited = JSON.stringify(Array.isArray(s.slidesVisited) ? s.slidesVisited : []);
    const quizScore = s.quizScore === null || s.quizScore === undefined || s.quizScore === "" ? null : Number(s.quizScore);
    const quizTotal = Number(s.quizTotal) || 8;
    const completed = Boolean(s.completed);
    const createdAt = s.createdAt || new Date().toISOString();
    await sql`INSERT INTO students (id, name, class_name, current_slide, max_slide, slides_visited, quiz_score, quiz_total, completed, created_at, updated_at)
      VALUES (${String(s.id)}, ${name}, ${className}, ${currentSlide}, ${maxSlide}, ${visited}, ${quizScore}, ${quizTotal}, ${completed}, ${createdAt}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name,
        current_slide = EXCLUDED.current_slide,
        max_slide = GREATEST(students.max_slide, EXCLUDED.max_slide),
        slides_visited = EXCLUDED.slides_visited,
        quiz_score = EXCLUDED.quiz_score,
        quiz_total = EXCLUDED.quiz_total,
        completed = EXCLUDED.completed,
        updated_at = NOW()`;
    return res.status(200).json({ ok: true });
  }

  if (body.type === "answers") {
    const id = String(body.id || "");
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    if (!id) return res.status(400).json({ error: "MISSING_ID" });
    const keys = Object.keys(answers).slice(0, 80);
    for (const rawKey of keys) {
      const key = String(rawKey).slice(0, 60);
      const value = String(answers[rawKey] ?? "").slice(0, 4000);
      const rid = `${id}:${key}`;
      await sql`INSERT INTO responses (id, student_id, answer_key, value, updated_at)
        VALUES (${rid}, ${id}, ${key}, ${value}, NOW())
        ON CONFLICT (student_id, answer_key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
    }
    if (keys.length) await sql`UPDATE students SET updated_at = NOW() WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "BAD_TYPE" });
}

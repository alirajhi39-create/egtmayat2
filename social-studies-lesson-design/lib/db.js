import { neon } from "@neondatabase/serverless";

export function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    ""
  );
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  return neon(url);
}

let schemaPromise = null;

export function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        class_name TEXT DEFAULT '',
        current_slide INTEGER DEFAULT 0,
        max_slide INTEGER DEFAULT 0,
        slides_visited TEXT DEFAULT '[]',
        quiz_score INTEGER,
        quiz_total INTEGER DEFAULT 8,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        answer_key TEXT NOT NULL,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (student_id, answer_key)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS sounds (
        sound_key TEXT PRIMARY KEY,
        filename TEXT,
        mime TEXT,
        data TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`;
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

function iso(v) {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export function mapStudent(row, answers = {}) {
  let slidesVisited = [];
  try {
    slidesVisited = JSON.parse(row.slides_visited || "[]");
    if (!Array.isArray(slidesVisited)) slidesVisited = [];
  } catch {
    slidesVisited = [];
  }
  return {
    id: row.id,
    name: row.name,
    className: row.class_name || "",
    currentSlide: Number(row.current_slide || 0),
    maxSlide: Number(row.max_slide || 0),
    slidesVisited,
    quizScore: row.quiz_score === null || row.quiz_score === undefined ? null : Number(row.quiz_score),
    quizTotal: Number(row.quiz_total || 8),
    completed: Boolean(row.completed),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    answers,
  };
}

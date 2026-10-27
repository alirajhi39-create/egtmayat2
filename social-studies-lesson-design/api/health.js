import { getSql, ensureSchema } from "../lib/db.js";

export default async function handler(_req, res) {
  const pinFromEnv = Boolean(process.env.TEACHER_PIN);
  const sql = getSql();
  if (!sql) {
    return res.status(200).json({
      api: true,
      database: false,
      pinSet: pinFromEnv,
      pinFromEnv,
      message: "أضف متغير DATABASE_URL من Neon في إعدادات Vercel",
    });
  }
  try {
    await ensureSchema(sql);
    await sql`SELECT 1 AS ok`;
    return res.status(200).json({
      api: true,
      database: true,
      pinSet: pinFromEnv,
      pinFromEnv,
    });
  } catch (e) {
    return res.status(200).json({
      api: true,
      database: false,
      pinSet: pinFromEnv,
      pinFromEnv,
      error: String(e?.message || e),
    });
  }
}

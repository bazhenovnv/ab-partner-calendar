import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function score(e, user) {
  let s = 0;
  if (user?.city === e.city) s += 30;
  if (e.is_free) s += 5;
  return s;
}

export async function getFeed(chatId: number) {
  const user = await pool.query(
    SELECT * FROM subscribers WHERE chat_id=, [chatId]
  );

  const events = await pool.query(
    SELECT * FROM events ORDER BY created_at DESC LIMIT 30
  );

  return events.rows.map(e => ({
    ...e,
    score: score(e, user.rows[0])
  }));
}

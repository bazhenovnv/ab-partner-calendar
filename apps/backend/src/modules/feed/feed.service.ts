import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function score(event: any, user: any) {
  let s = 0;

  if (!user) return s;

  if (user.city && event.city === user.city) s += 30;
  if (event.is_free) s += 5;

  return s;
}

export async function getFeed(chatId: number) {
  // получаем пользователя
  const userRes = await pool.query(
    "SELECT * FROM subscribers WHERE chat_id = $1 LIMIT 1",
    [chatId]
  );

  const user = userRes.rows[0];

  // получаем события
  const eventsRes = await pool.query(
    "SELECT * FROM events ORDER BY created_at DESC LIMIT 30"
  );

  const events = eventsRes.rows;

  return events.map((e: any) => ({
  ...e,
  score: score(e, user),
}));
}
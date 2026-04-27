import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type Event = {
  id: number;
  title: string;
  city: string;
  date: string;
  link: string;
  is_free?: boolean;
  created_at?: string;
};

type User = {
  chat_id: number;
  city?: string;
};

// простая скоринговая система
function score(event: Event, user?: User) {
  let s = 0;

  if (user?.city && event.city === user.city) s += 30;
  if (event.is_free) s += 5;

  return s;
}

export async function getFeed(chatId: number): Promise<Event[]> {
  // пользователь
  const userRes = await pool.query(
    "SELECT * FROM subscribers WHERE chat_id = $1 LIMIT 1",
    [chatId]
  );

  const user: User | undefined = userRes.rows[0];

  // события
  const eventsRes = await pool.query(
    "SELECT * FROM events ORDER BY created_at DESC LIMIT 30"
  );

  const events: Event[] = eventsRes.rows;

  // скоринг + сортировка
  return events
    .map((e) => ({
      ...e,
      score: score(e, user),
    }))
    .sort((a, b) => b.score - a.score);
}
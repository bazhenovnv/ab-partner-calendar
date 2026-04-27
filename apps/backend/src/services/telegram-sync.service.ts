import axios from "axios";
import { aiParseEvent } from "./ai-parser.service";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CHANNEL = process.env.TELEGRAM_CHANNEL_USERNAME;

export async function syncTelegram() {
  console.log("🔄 Telegram sync started");

  // ⚠️ Telegram Bot API НЕ читает канал → используем tg RSS bridge
  const url = `https://api.rss2json.com/v1/api.json?rss_url=https://tg.i-c-a.su/rss/${CHANNEL}`;

  const res = await axios.get(url);
  const posts = res.data.items || [];

  for (const post of posts.slice(0, 10)) {
    const text = post.title + "\n" + post.description;

    const parsed = await aiParseEvent(text);

    if (!parsed) continue;

    await pool.query(
      `
      INSERT INTO events (title, city, date, link, is_free)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
      `,
      [
        parsed.title,
        parsed.city || null,
        parsed.date || null,
        parsed.link || post.link,
        parsed.isFree ?? false,
      ]
    );

    console.log("✅ Saved:", parsed.title);
  }

  console.log("✅ Telegram sync done");
}
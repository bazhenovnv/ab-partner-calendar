# Создание структуры
mkdir apps/backend/src/services -Force
mkdir apps/backend/src/modules/feed -Force
mkdir apps/frontend/app/feed -Force

# --- AI PARSER ---
@"
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function aiParseEvent(text: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-5.3",
    messages: [{
      role: "user",
      content: `Извлеки событие JSON: title, city, date, timeFrom, format, isFree, link\n${text}`
    }],
    temperature: 0,
  });

  try {
    return JSON.parse(res.choices[0].message.content || "{}");
  } catch {
    return null;
  }
}
"@ | Out-File apps/backend/src/services/ai-parser.service.ts -Encoding utf8

# --- SMART PARSER ---
@"
import { aiParseEvent } from "./ai-parser.service";

export async function parseEventSmart(text: string) {
  const ai = await aiParseEvent(text);
  if (ai && ai.title) return ai;

  return {
    title: text.slice(0,120),
    description: text
  };
}
"@ | Out-File apps/backend/src/services/event-parser.service.ts -Encoding utf8

# --- FEED SERVICE ---
@"
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
    `SELECT * FROM subscribers WHERE chat_id=$1`, [chatId]
  );

  const events = await pool.query(`
    SELECT * FROM events ORDER BY created_at DESC LIMIT 30
  `);

  return events.rows.map(e => ({
    ...e,
    score: score(e, user.rows[0])
  }));
}
"@ | Out-File apps/backend/src/modules/feed/feed.service.ts -Encoding utf8

# --- FEED CONTROLLER ---
@"
import { Controller, Get, Query } from "@nestjs/common";
import { getFeed } from "./feed.service";

@Controller("feed")
export class FeedController {
  @Get()
  async get(@Query("chatId") chatId: string) {
    return getFeed(Number(chatId));
  }
}
"@ | Out-File apps/backend/src/modules/feed/feed.controller.ts -Encoding utf8

# --- BOT ---
@"
import TelegramBot from "node-telegram-bot-api";
import { getFeed } from "./modules/feed/feed.service";

const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Подписка активна");
});

bot.onText(/\/feed/, async (msg) => {
  const feed = await getFeed(msg.chat.id);
  for (const e of feed.slice(0,5)) {
    await bot.sendMessage(msg.chat.id,
      `🔥 ${e.title}\n📍 ${e.city}\n${e.source_url || ""}`);
  }
});
"@ | Out-File apps/backend/src/bot.service.ts -Encoding utf8

# --- FRONTEND ---
@"
"use client";

import { useEffect, useState } from "react";

export default function Feed() {
  const [events,setEvents]=useState([]);

  useEffect(()=>{
    fetch("/api/feed?chatId=1")
      .then(r=>r.json())
      .then(setEvents);
  },[]);

  return (
    <div>
      {events.map(e=>(
        <div key={e.id}>
          <h2>{e.title}</h2>
        </div>
      ))}
    </div>
  );
}
"@ | Out-File apps/frontend/app/feed/page.tsx -Encoding utf8

# --- SQL ---
@"
ALTER TABLE events ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE
);
"@ | Out-File db.sql -Encoding utf8
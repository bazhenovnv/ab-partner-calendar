import TelegramBot from "node-telegram-bot-api";
import { getFeed } from "./modules/feed/feed.service";

const bot = new TelegramBot(process.env.BOT_TOKEN as string, {
  polling: true,
});

// старт
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Привет! Я бот событий 📅\nНапиши /feed");
});

// лента
bot.onText(/\/feed/, async (msg) => {
  const feed = await getFeed(msg.chat.id);

  for (const e of feed.slice(0, 5)) {
    await bot.sendMessage(
      msg.chat.id,
      `📅 ${e.title || "Событие"}
📍 ${e.city || "Не указан"}
🕒 ${e.date || "Дата не указана"}

${e.url || ""}`
    );
  }
});
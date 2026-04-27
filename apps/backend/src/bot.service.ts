import TelegramBot from "node-telegram-bot-api";
import { getFeed } from "./modules/feed/feed.service";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN is not defined");
}

const bot = new TelegramBot(token, { polling: true });

// Старт
bot.onText(/\/start/, (msg: any) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Привет! Я бот календаря мероприятий.\n\nКоманда /feed — получить подборку событий"
  );
});

// Лента событий
bot.onText(/\/feed/, async (msg: any) => {
  try {
    const feed = await getFeed(msg.chat.id);

    if (!feed.length) {
      return bot.sendMessage(msg.chat.id, "Нет событий 😢");
    }

    for (const e of feed.slice(0, 5)) {
      const text = `
📌 ${e.title || "Без названия"}
🏙 ${e.city || "Не указан"}
📅 ${e.date || "Не указана"}
🔗 ${e.link || ""}
      `;

      await bot.sendMessage(msg.chat.id, text);
    }
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, "Ошибка загрузки событий");
  }
});

export default bot;
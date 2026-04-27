import TelegramBot, { Message } from "node-telegram-bot-api";
import { getFeed } from "../modules/feed/feed.service";

const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: true });

bot.onText(/\/start/, (msg: Message) => {
  bot.sendMessage(msg.chat.id, "Подписка оформлена");
});

bot.onText(/\/feed/, async (msg: Message) => {
  const feed = await getFeed(msg.chat.id);

  for (const e of feed.slice(0, 5)) {
    await bot.sendMessage(
      msg.chat.id,
      `${e.title}\n${e.city} ${e.date}\n${e.link}`
    );
  }
});
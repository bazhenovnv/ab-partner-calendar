import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot = require('node-telegram-bot-api');
import { PrismaService } from '../../services/prisma.service';

const REMINDER_OPTIONS = [
  { label: 'за 15 минут', value: '15m' },
  { label: 'за 1 час', value: '1h' },
  { label: 'за 1 день', value: '1d' },
] as const;

type ReminderValue = (typeof REMINDER_OPTIONS)[number]['value'];

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: TelegramBot;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.log('TELEGRAM_BOT_TOKEN не задан — Telegram bot не запускается. Deep link останется внешней ссылкой.');
      return;
    }

    const polling = this.config.get<string>('TELEGRAM_BOT_POLLING', 'true') !== 'false';
    this.bot = new TelegramBot(token, { polling });
    this.registerHandlers(this.bot);
    this.logger.log(`Telegram bot запущен в режиме ${polling ? 'polling' : 'без polling'}.`);
  }

  async sync() {
    return { ok: true, botEnabled: Boolean(this.bot) };
  }

  private registerHandlers(bot: TelegramBot) {
    bot.onText(/\/start(?:\s+(.+))?/i, async (message, match) => {
      const chatId = message.chat.id;
      const payload = match?.[1]?.trim();

      if (!payload?.startsWith('afisha_')) {
        await bot.sendMessage(chatId, 'Здравствуйте. Откройте событие в календаре и нажмите «Напомнить в Telegram».');
        return;
      }

      const eventId = payload.replace(/^afisha_/, '');
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        await bot.sendMessage(chatId, 'Событие не найдено или уже удалено.');
        return;
      }

      await bot.sendMessage(chatId, `Выберите время напоминания:\n\n${event.title}\n${event.startAt.toLocaleString('ru-RU')}`, {
        reply_markup: {
          inline_keyboard: [
            REMINDER_OPTIONS.map((option) => ({
              text: option.label,
              callback_data: `rem:${event.id}:${option.value}`,
            })),
          ],
        },
      });
    });

    bot.on('callback_query', async (query) => {
      const data = query.data || '';
      if (!data.startsWith('rem:')) return;

      const [, eventId, remindBefore] = data.split(':') as [string, string, ReminderValue];
      const user = query.from;
      const chatId = query.message?.chat.id;

      if (!eventId || !REMINDER_OPTIONS.some((option) => option.value === remindBefore)) {
        await bot.answerCallbackQuery(query.id, { text: 'Некорректный формат напоминания.' });
        return;
      }

      await this.prisma.reminder.upsert({
        where: {
          eventId_telegramUserId_remindBefore: {
            eventId,
            telegramUserId: String(user.id),
            remindBefore,
          },
        },
        update: {
          telegramUsername: user.username || null,
          isActive: true,
        },
        create: {
          eventId,
          telegramUserId: String(user.id),
          telegramUsername: user.username || null,
          remindBefore,
        },
      });

      await bot.answerCallbackQuery(query.id, { text: 'Напоминание сохранено.' });
      if (chatId) {
        await bot.sendMessage(chatId, 'Готово. Напоминание добавлено в календарь уведомлений.');
      }
    });
  }
}

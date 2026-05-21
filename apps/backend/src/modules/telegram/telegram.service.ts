import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot = require('node-telegram-bot-api');
import { PrismaService } from '../../services/prisma.service';

const REMINDER_OPTIONS = [
  { label: 'За 5 минут', value: '5m' },
  { label: 'За 15 минут', value: '15m' },
  { label: 'За 30 минут', value: '30m' },
  { label: 'За 1 час', value: '1h' },
  { label: 'За 1 день', value: '1d' },
] as const;

type ReminderValue = (typeof REMINDER_OPTIONS)[number]['value'];

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: TelegramBot;
  private reminderTimer?: NodeJS.Timeout;
  private readonly selectedReminders = new Map<string, Set<ReminderValue>>();

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
    this.startReminderDispatcher();
    this.logger.log(`Telegram bot запущен в режиме ${polling ? 'polling' : 'без polling'}.`);
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
    if (this.bot) this.bot.stopPolling().catch(() => undefined);
  }

  async sync() {
    return { ok: true, botEnabled: Boolean(this.bot) };
  }

  async sendBroadcastMessage(chatId: string, text: string) {
    if (!this.bot) {
      throw new Error('Telegram bot не запущен: TELEGRAM_BOT_TOKEN не задан или backend не пересоздан.');
    }

    return this.bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });
  }

  private registerHandlers(bot: TelegramBot) {
    bot.onText(/\/start(?:\s+(.+))?/i, async (message, match) => {
      const chatId = message.chat.id;
      const payload = match?.[1]?.trim();

      await this.upsertSubscriber(chatId, message.from);

      if (!payload?.startsWith('afisha_')) {
        await bot.sendMessage(
          chatId,
          [
            'Здравствуйте! Вы подписаны на рассылку АБ | Партнёры.',
            '',
            'Здесь будут приходить важные новости, анонсы мероприятий и уведомления от календаря.',
            '',
            'Напоминания о конкретном мероприятии настраиваются только при переходе из календаря по кнопке «Напомнить».',
            '',
            'Чтобы отписаться от рассылки, отправьте /unsubscribe.',
          ].join('\n'),
        );
        return;
      }

      const eventId = payload.replace(/^afisha_/, '');
      const event = await this.prisma.event.findFirst({
        where: { id: eventId, deletedAt: null, published: true },
      });

      if (!event) {
        await bot.sendMessage(chatId, 'Событие не найдено, уже удалено или больше не опубликовано.');
        return;
      }

      const selectionKey = this.getSelectionKey(chatId, event.id);
      this.selectedReminders.set(selectionKey, new Set());

      await bot.sendMessage(
        chatId,
        [
          'Вы можете выбрать несколько временных периодов для напоминания.',
          '',
          event.title,
          event.startAt.toLocaleString('ru-RU'),
          '',
          'Нажимайте на варианты, чтобы поставить или снять галочку. Затем нажмите «Готово».',
        ].join('\n'),
        { reply_markup: this.buildReminderKeyboard(event.id, this.selectedReminders.get(selectionKey) || new Set()) },
      );
    });

    bot.onText(/\/unsubscribe/i, async (message) => {
      const chatId = String(message.chat.id);
      await this.prisma.telegramSubscriber.updateMany({
        where: { chatId },
        data: { isActive: false, lastSeenAt: new Date() },
      });
      await bot.sendMessage(message.chat.id, 'Вы отписаны от рассылки. Напоминания, которые вы уже настроили, останутся активными.');
    });

    bot.on('callback_query', async (query) => {
      const data = query.data || '';
      if (!data.startsWith('remtoggle:') && !data.startsWith('remdone:')) return;

      const user = query.from;
      const chatId = query.message?.chat.id;
      if (!chatId) {
        await bot.answerCallbackQuery(query.id, { text: 'Не удалось определить чат.' });
        return;
      }

      await this.upsertSubscriber(chatId, user);

      if (data.startsWith('remtoggle:')) {
        const [, eventId, remindBefore] = data.split(':') as [string, string, ReminderValue];
        if (!eventId || !this.isReminderValue(remindBefore)) {
          await bot.answerCallbackQuery(query.id, { text: 'Некорректный формат напоминания.' });
          return;
        }

        const selectionKey = this.getSelectionKey(chatId, eventId);
        const selected = this.selectedReminders.get(selectionKey) || new Set<ReminderValue>();
        if (selected.has(remindBefore)) selected.delete(remindBefore);
        else selected.add(remindBefore);
        this.selectedReminders.set(selectionKey, selected);

        await bot.answerCallbackQuery(query.id, {
          text: selected.has(remindBefore) ? 'Период выбран.' : 'Период снят.',
        });

        await bot.editMessageReplyMarkup(this.buildReminderKeyboard(eventId, selected), {
          chat_id: chatId,
          message_id: query.message?.message_id,
        });
        return;
      }

      if (data.startsWith('remdone:')) {
        const [, eventId] = data.split(':');
        if (!eventId) {
          await bot.answerCallbackQuery(query.id, { text: 'Событие не найдено.' });
          return;
        }

        const event = await this.prisma.event.findFirst({
          where: { id: eventId, deletedAt: null, published: true },
        });
        if (!event) {
          await bot.answerCallbackQuery(query.id, { text: 'Событие не найдено или удалено.' });
          return;
        }

        const selectionKey = this.getSelectionKey(chatId, eventId);
        const selected = [...(this.selectedReminders.get(selectionKey) || new Set<ReminderValue>())];

        if (selected.length === 0) {
          await bot.answerCallbackQuery(query.id, { text: 'Выберите хотя бы один период.' });
          return;
        }

        for (const remindBefore of selected) {
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
        }

        this.selectedReminders.delete(selectionKey);

        const labels = selected
          .map((value) => REMINDER_OPTIONS.find((option) => option.value === value)?.label || value)
          .join('\n— ');

        await bot.answerCallbackQuery(query.id, { text: 'Напоминания сохранены.' });
        await bot.sendMessage(chatId, `Готово. Напоминания добавлены:\n— ${labels}`);
      }
    });
  }

  private async upsertSubscriber(chatId: number, user?: TelegramUser) {
    if (!user) return;

    await this.prisma.telegramSubscriber.upsert({
      where: { telegramUserId: String(user.id) },
      update: {
        chatId: String(chatId),
        username: user.username || null,
        firstName: user.first_name || null,
        lastName: user.last_name || null,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        telegramUserId: String(user.id),
        chatId: String(chatId),
        username: user.username || null,
        firstName: user.first_name || null,
        lastName: user.last_name || null,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  private buildReminderKeyboard(eventId: string, selected: Set<ReminderValue>) {
    const buttons = REMINDER_OPTIONS.map((option) => ({
      text: `${selected.has(option.value) ? '✅' : '⬜'} ${option.label}`,
      callback_data: `remtoggle:${eventId}:${option.value}`,
    }));

    return {
      inline_keyboard: [
        [buttons[0], buttons[1]],
        [buttons[2], buttons[3]],
        [buttons[4]],
        [{ text: 'Готово', callback_data: `remdone:${eventId}` }],
      ],
    };
  }

  private getSelectionKey(chatId: number, eventId: string) {
    return `${chatId}:${eventId}`;
  }

  private isReminderValue(value: string): value is ReminderValue {
    return REMINDER_OPTIONS.some((option) => option.value === value);
  }

  private startReminderDispatcher() {
    this.checkDueReminders().catch((error) => this.logger.error(`Ошибка отправки напоминаний: ${error.message}`));
    this.reminderTimer = setInterval(() => {
      this.checkDueReminders().catch((error) => this.logger.error(`Ошибка отправки напоминаний: ${error.message}`));
    }, 60_000);
  }

  private async checkDueReminders() {
    if (!this.bot) return;

    const now = new Date();
    const activeReminders = await this.prisma.reminder.findMany({
      where: {
        isActive: true,
        event: { deletedAt: null, published: true },
      },
      include: { event: true },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    for (const reminder of activeReminders) {
      const dueAt = new Date(reminder.event.startAt.getTime() - this.reminderOffsetMs(reminder.remindBefore));
      if (dueAt > now) continue;

      try {
        await this.bot.sendMessage(
          reminder.telegramUserId,
          [
            'Напоминание о мероприятии',
            '',
            reminder.event.title,
            reminder.event.startAt.toLocaleString('ru-RU'),
            reminder.event.location,
          ].join('\n'),
        );
        await this.prisma.reminder.update({ where: { id: reminder.id }, data: { isActive: false } });
      } catch (error) {
        this.logger.warn(`Не удалось отправить напоминание ${reminder.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private reminderOffsetMs(value: string) {
    switch (value) {
      case '5m':
        return 5 * 60 * 1000;
      case '15m':
        return 15 * 60 * 1000;
      case '30m':
        return 30 * 60 * 1000;
      case '1h':
        return 60 * 60 * 1000;
      case '1d':
        return 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}

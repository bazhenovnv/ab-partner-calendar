import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
type AdminState = { mode: 'awaiting_broadcast_text' } | { mode: 'confirm_broadcast'; broadcastId: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseReminderOffset(value: string) {
  const match = /^(\d+)(m|h|d)$/.exec(value);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'm') return amount * 60_000;
  if (unit === 'h') return amount * 60 * 60_000;
  if (unit === 'd') return amount * 24 * 60 * 60_000;
  return 0;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: TelegramBot;
  private readonly reminderSelections = new Map<string, Set<ReminderValue>>();
  private readonly adminStates = new Map<string, AdminState>();
  private reminderTimer?: NodeJS.Timeout;

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
    this.startReminderLoop();
    this.logger.log(`Telegram bot запущен в режиме ${polling ? 'polling' : 'без polling'}.`);
  }

  async sync() {
    return { ok: true, botEnabled: Boolean(this.bot) };
  }

  isEnabled() {
    return Boolean(this.bot);
  }

  async sendBroadcastMessage(chatId: string, text: string) {
    if (!this.bot) throw new Error('Telegram bot не запущен');
    return this.bot.sendMessage(chatId, text, { disable_web_page_preview: true });
  }

  private registerHandlers(bot: TelegramBot) {
    bot.onText(/\/start(?:\s+(.+))?/i, async (message, match) => {
      const chatId = message.chat.id;
      const payload = match?.[1]?.trim();
      await this.upsertSubscriber(message);

      if (payload?.startsWith('afisha_')) {
        await this.openReminderFlow(bot, message, payload.replace(/^afisha_/, ''));
        return;
      }

      if (this.isAdmin(message)) {
        await this.sendAdminPanel(bot, chatId);
        return;
      }

      await this.sendSubscriberWelcome(bot, chatId);
    });

    bot.onText(/\/unsubscribe/i, async (message) => {
      await this.prisma.telegramSubscriber.updateMany({
        where: { telegramUserId: String(message.from?.id || message.chat.id) },
        data: { isActive: false, lastSeenAt: new Date() },
      });
      await bot.sendMessage(message.chat.id, 'Вы отписаны от рассылки. Чтобы снова подписаться, отправьте /start.');
    });

    bot.on('message', async (message) => {
      if (!message.text || message.text.startsWith('/')) return;
      await this.upsertSubscriber(message);
      if (!this.isAdmin(message)) return;

      const state = this.adminStates.get(String(message.from?.id || message.chat.id));
      if (!state || state.mode !== 'awaiting_broadcast_text') return;

      const text = message.text.trim();
      if (!text) return;

      const title = text.split('\n')[0].slice(0, 80) || 'Рассылка';
      const broadcast = await this.prisma.broadcast.create({
        data: {
          title,
          text,
          status: 'DRAFT',
        },
      });

      this.adminStates.set(String(message.from?.id || message.chat.id), { mode: 'confirm_broadcast', broadcastId: broadcast.id });

      await bot.sendMessage(message.chat.id, `Предпросмотр рассылки:\n\n${text}\n\nОтправить всем активным подписчикам?`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Отправить', callback_data: `admin:broadcast:send:${broadcast.id}` },
              { text: '❌ Отмена', callback_data: `admin:broadcast:cancel:${broadcast.id}` },
            ],
          ],
        },
      });
    });

    bot.on('callback_query', async (query) => {
      const data = query.data || '';
      const chatId = query.message?.chat.id;
      if (!chatId) return;

      if (data.startsWith('remtoggle:')) {
        await this.handleReminderToggle(bot, query, data);
        return;
      }

      if (data.startsWith('remdone:')) {
        await this.handleReminderDone(bot, query, data);
        return;
      }

      if (data.startsWith('rem:')) {
        await this.handleLegacySingleReminder(bot, query, data);
        return;
      }

      if (data.startsWith('admin:')) {
        if (!this.isAdminQuery(query)) {
          await bot.answerCallbackQuery(query.id, { text: 'Нет доступа.' });
          return;
        }
        await this.handleAdminCallback(bot, query, data);
      }
    });
  }

  private async upsertSubscriber(message: TelegramBot.Message) {
    const from = message.from;
    if (!from) return;
    await this.prisma.telegramSubscriber.upsert({
      where: { telegramUserId: String(from.id) },
      update: {
        chatId: String(message.chat.id),
        username: from.username || null,
        firstName: from.first_name || null,
        lastName: from.last_name || null,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        telegramUserId: String(from.id),
        chatId: String(message.chat.id),
        username: from.username || null,
        firstName: from.first_name || null,
        lastName: from.last_name || null,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  private async sendSubscriberWelcome(bot: TelegramBot, chatId: number) {
    await bot.sendMessage(
      chatId,
      'Здравствуйте! Вы подписаны на рассылку АБ | Партнёры.\n\nЗдесь будут приходить важные новости, анонсы мероприятий и уведомления от календаря.\n\nНапоминания о конкретном мероприятии настраиваются только при переходе из календаря по кнопке «Напомнить».\n\nЧтобы отписаться от рассылки, отправьте /unsubscribe.',
    );
  }

  private async sendAdminPanel(bot: TelegramBot, chatId: number) {
    await bot.sendMessage(chatId, '⚙️ Админ-панель рассылки\n\nВыберите действие:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Новая рассылка', callback_data: 'admin:broadcast:new' }],
          [
            { text: '👥 Подписчики', callback_data: 'admin:subscribers' },
            { text: '📊 Статистика', callback_data: 'admin:stats' },
          ],
          [{ text: '📄 Экспорт TXT', callback_data: 'admin:export' }],
        ],
      },
    });
  }

  private isAdmin(message: TelegramBot.Message) {
    const ids = this.adminIds();
    const usernames = this.adminUsernames();
    const userId = String(message.from?.id || '');
    const chatId = String(message.chat.id || '');
    const username = (message.from?.username || '').toLowerCase();
    return ids.has(userId) || ids.has(chatId) || (username && usernames.has(username));
  }

  private isAdminQuery(query: TelegramBot.CallbackQuery) {
    const ids = this.adminIds();
    const usernames = this.adminUsernames();
    const userId = String(query.from.id || '');
    const username = (query.from.username || '').toLowerCase();
    return ids.has(userId) || (username && usernames.has(username));
  }

  private adminIds() {
    const raw = this.config.get<string>('TELEGRAM_BOT_ADMIN_IDS', '');
    return new Set(raw.split(',').map((item) => item.trim()).filter(Boolean));
  }

  private adminUsernames() {
    const raw = this.config.get<string>('TELEGRAM_BOT_ADMIN_USERNAMES', '');
    return new Set(raw.split(',').map((item) => item.trim().replace(/^@/, '').toLowerCase()).filter(Boolean));
  }

  private selectionKey(userId: number, eventId: string) {
    return `${userId}:${eventId}`;
  }

  private async openReminderFlow(bot: TelegramBot, message: TelegramBot.Message, eventId: string) {
    const chatId = message.chat.id;
    const userId = message.from?.id;
    const event = await this.prisma.event.findFirst({ where: { id: eventId, deletedAt: null, published: true } });
    if (!event || !userId) {
      await bot.sendMessage(chatId, 'Событие не найдено или уже удалено.');
      return;
    }

    const key = this.selectionKey(userId, event.id);
    this.reminderSelections.set(key, new Set<ReminderValue>());

    await bot.sendMessage(
      chatId,
      `Вы можете выбрать несколько временных периодов для напоминания.\n\n${event.title}\n${event.startAt.toLocaleString('ru-RU')}\n\nНажимайте на варианты, чтобы поставить или снять галочку. Затем нажмите «Готово».`,
      { reply_markup: { inline_keyboard: this.reminderKeyboard(event.id, this.reminderSelections.get(key) || new Set()) } },
    );
  }

  private reminderKeyboard(eventId: string, selected: Set<ReminderValue>) {
    const rows = [
      REMINDER_OPTIONS.slice(0, 2),
      REMINDER_OPTIONS.slice(2, 4),
      REMINDER_OPTIONS.slice(4),
    ].map((row) =>
      row.map((option) => ({
        text: `${selected.has(option.value) ? '✅' : '⬜'} ${option.label}`,
        callback_data: `remtoggle:${eventId}:${option.value}`,
      })),
    );

    rows.push([{ text: 'Готово', callback_data: `remdone:${eventId}` }]);
    return rows;
  }

  private async handleReminderToggle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string) {
    const [, eventId, value] = data.split(':') as [string, string, ReminderValue];
    if (!eventId || !REMINDER_OPTIONS.some((option) => option.value === value)) {
      await bot.answerCallbackQuery(query.id, { text: 'Некорректный формат напоминания.' });
      return;
    }
    const key = this.selectionKey(query.from.id, eventId);
    const selected = this.reminderSelections.get(key) || new Set<ReminderValue>();
    if (selected.has(value)) selected.delete(value);
    else selected.add(value);
    this.reminderSelections.set(key, selected);

    if (query.message) {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: this.reminderKeyboard(eventId, selected) },
        { chat_id: query.message.chat.id, message_id: query.message.message_id },
      );
    }
    await bot.answerCallbackQuery(query.id, { text: selected.has(value) ? 'Выбрано' : 'Снято' });
  }

  private async handleReminderDone(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string) {
    const [, eventId] = data.split(':');
    const selected = this.reminderSelections.get(this.selectionKey(query.from.id, eventId)) || new Set<ReminderValue>();
    if (!selected.size) {
      await bot.answerCallbackQuery(query.id, { text: 'Выберите хотя бы один период.' });
      return;
    }

    const event = await this.prisma.event.findFirst({ where: { id: eventId, deletedAt: null, published: true } });
    if (!event) {
      await bot.answerCallbackQuery(query.id, { text: 'Событие не найдено.' });
      return;
    }

    for (const remindBefore of selected) {
      await this.prisma.reminder.upsert({
        where: {
          eventId_telegramUserId_remindBefore: {
            eventId,
            telegramUserId: String(query.from.id),
            remindBefore,
          },
        },
        update: {
          telegramUsername: query.from.username || null,
          isActive: true,
          sentAt: null,
        },
        create: {
          eventId,
          telegramUserId: String(query.from.id),
          telegramUsername: query.from.username || null,
          remindBefore,
        },
      });
    }

    this.reminderSelections.delete(this.selectionKey(query.from.id, eventId));
    await bot.answerCallbackQuery(query.id, { text: 'Напоминания сохранены.' });
    const labels = [...selected]
      .map((value) => REMINDER_OPTIONS.find((option) => option.value === value)?.label)
      .filter(Boolean)
      .map((label) => `— ${label}`)
      .join('\n');

    if (query.message) {
      await bot.sendMessage(query.message.chat.id, `Готово. Напоминания добавлены:\n${labels}\n\nНапоминание о мероприятии\n\n${event.title}\n${event.startAt.toLocaleString('ru-RU')}\n${event.format === 'ONLINE' ? 'Онлайн' : event.location}`);
    }
  }

  private async handleLegacySingleReminder(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string) {
    const [, eventId, remindBefore] = data.split(':') as [string, string, ReminderValue];
    if (!eventId || !REMINDER_OPTIONS.some((option) => option.value === remindBefore)) {
      await bot.answerCallbackQuery(query.id, { text: 'Некорректный формат напоминания.' });
      return;
    }

    await this.prisma.reminder.upsert({
      where: {
        eventId_telegramUserId_remindBefore: {
          eventId,
          telegramUserId: String(query.from.id),
          remindBefore,
        },
      },
      update: {
        telegramUsername: query.from.username || null,
        isActive: true,
        sentAt: null,
      },
      create: {
        eventId,
        telegramUserId: String(query.from.id),
        telegramUsername: query.from.username || null,
        remindBefore,
      },
    });

    await bot.answerCallbackQuery(query.id, { text: 'Напоминание сохранено.' });
    if (query.message?.chat.id) {
      await bot.sendMessage(query.message.chat.id, 'Готово. Напоминание добавлено в календарь уведомлений.');
    }
  }

  private async handleAdminCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string) {
    const chatId = query.message?.chat.id;
    if (!chatId) return;
    const adminKey = String(query.from.id);

    if (data === 'admin:broadcast:new') {
      this.adminStates.set(adminKey, { mode: 'awaiting_broadcast_text' });
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, 'Пришлите текст рассылки одним сообщением. После этого бот покажет предпросмотр и кнопку отправки.');
      return;
    }

    if (data === 'admin:subscribers') {
      const active = await this.prisma.telegramSubscriber.count({ where: { isActive: true } });
      const total = await this.prisma.telegramSubscriber.count();
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, `Подписчики:\nАктивных: ${active}\nВсего в базе: ${total}`);
      return;
    }

    if (data === 'admin:stats') {
      const [subscribers, reminders, broadcasts] = await Promise.all([
        this.prisma.telegramSubscriber.count({ where: { isActive: true } }),
        this.prisma.reminder.count(),
        this.prisma.broadcast.count(),
      ]);
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, `Статистика:\nПодписчиков: ${subscribers}\nНапоминаний: ${reminders}\nРассылок: ${broadcasts}`);
      return;
    }

    if (data === 'admin:export') {
      const subscribers = await this.prisma.telegramSubscriber.findMany({ orderBy: { createdAt: 'desc' } });
      const text = subscribers
        .map((item) => `${item.telegramUserId}\t${item.chatId}\t@${item.username || '-'}\t${item.firstName || ''} ${item.lastName || ''}\tactive=${item.isActive}`)
        .join('\n') || 'Подписчиков нет';
      await bot.answerCallbackQuery(query.id);
      await bot.sendDocument(
        chatId,
        Buffer.from(text, 'utf-8'),
        { caption: 'Экспорт подписчиков TXT' },
        { filename: 'telegram-subscribers.txt', contentType: 'text/plain' },
      );
      return;
    }

    if (data.startsWith('admin:broadcast:cancel:')) {
      const id = data.replace('admin:broadcast:cancel:', '');
      await this.prisma.broadcast.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'CANCELED' } });
      this.adminStates.delete(adminKey);
      await bot.answerCallbackQuery(query.id, { text: 'Рассылка отменена.' });
      await bot.sendMessage(chatId, 'Рассылка отменена.');
      return;
    }

    if (data.startsWith('admin:broadcast:send:')) {
      const id = data.replace('admin:broadcast:send:', '');
      await bot.answerCallbackQuery(query.id, { text: 'Отправляю рассылку...' });
      const result = await this.sendBroadcastById(id);
      this.adminStates.delete(adminKey);
      await bot.sendMessage(chatId, `Рассылка завершена.\nОтправлено: ${result.sent}\nОшибок: ${result.failed}`);
    }
  }

  async sendBroadcastById(id: string) {
    if (!this.bot) throw new Error('Telegram bot не запущен');
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new Error('Рассылка не найдена');
    if (broadcast.status === 'SENT') return { sent: broadcast.sentCount, failed: broadcast.failedCount };

    const subscribers = await this.prisma.telegramSubscriber.findMany({ where: { isActive: true } });
    let sent = 0;
    let failed = 0;

    await this.prisma.broadcast.update({ where: { id }, data: { status: 'SENDING' } });

    for (const subscriber of subscribers) {
      try {
        await this.bot.sendMessage(subscriber.chatId, broadcast.text, { disable_web_page_preview: true });
        sent += 1;
        await this.prisma.broadcastDelivery.create({
          data: {
            broadcastId: id,
            subscriberId: subscriber.id,
            chatId: subscriber.chatId,
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch (error) {
        failed += 1;
        await this.prisma.broadcastDelivery.create({
          data: {
            broadcastId: id,
            subscriberId: subscriber.id,
            chatId: subscriber.chatId,
            status: 'FAILED',
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    await this.prisma.broadcast.update({
      where: { id },
      data: {
        status: 'SENT',
        sentCount: sent,
        failedCount: failed,
        sentAt: new Date(),
      },
    });

    return { sent, failed };
  }

  private startReminderLoop() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
    this.reminderTimer = setInterval(() => {
      this.sendDueReminders().catch((error) => this.logger.error(`Ошибка отправки напоминаний: ${error instanceof Error ? error.message : error}`));
    }, 60_000);
    this.sendDueReminders().catch(() => undefined);
  }

  private async sendDueReminders() {
    if (!this.bot) return;
    const now = new Date();
    const reminders = await this.prisma.reminder.findMany({
      where: {
        isActive: true,
        sentAt: null,
        event: {
          deletedAt: null,
          published: true,
        },
      },
      include: { event: true },
      take: 100,
    });

    for (const reminder of reminders) {
      const offset = parseReminderOffset(reminder.remindBefore);
      if (!offset) continue;
      const dueAt = new Date(reminder.event.startAt.getTime() - offset);
      if (dueAt > now) continue;
      if (reminder.event.startAt.getTime() + 60 * 60_000 < now.getTime()) {
        await this.prisma.reminder.update({ where: { id: reminder.id }, data: { isActive: false, sentAt: now } });
        continue;
      }

      const subscriber = await this.prisma.telegramSubscriber.findUnique({ where: { telegramUserId: reminder.telegramUserId } });
      const chatId = subscriber?.chatId || reminder.telegramUserId;
      try {
        await this.bot.sendMessage(
          chatId,
          `Напоминание о мероприятии\n\n${escapeHtml(reminder.event.title)}\n${reminder.event.startAt.toLocaleString('ru-RU')}\n${reminder.event.format === 'ONLINE' ? 'Онлайн' : reminder.event.location}`,
          { parse_mode: 'HTML', disable_web_page_preview: true },
        );
        await this.prisma.reminder.update({ where: { id: reminder.id }, data: { isActive: false, sentAt: new Date() } });
      } catch (error) {
        this.logger.warn(`Не удалось отправить напоминание ${reminder.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  list() {
    return this.prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { deliveries: true } } },
    });
  }

  subscribers() {
    return this.prisma.telegramSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(body: { title?: string; text?: string }) {
    const text = body.text?.trim();
    if (!text) throw new BadRequestException('Текст рассылки обязателен');
    const title = body.title?.trim() || text.split('\n')[0].slice(0, 80) || 'Рассылка';
    return this.prisma.broadcast.create({
      data: {
        title,
        text,
        status: 'DRAFT',
      },
    });
  }

  async update(id: string, body: { title?: string; text?: string; status?: string }) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException('Рассылка не найдена');
    if (broadcast.status === 'SENT') throw new BadRequestException('Отправленную рассылку нельзя редактировать');

    return this.prisma.broadcast.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() || broadcast.title } : {}),
        ...(body.text !== undefined ? { text: body.text.trim() } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });
  }

  async send(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException('Рассылка не найдена');
    if (!this.telegram.isEnabled()) throw new BadRequestException('Telegram bot не запущен');
    const result = await this.telegram.sendBroadcastById(id);
    return { id, ...result };
  }

  deliveries(id: string) {
    return this.prisma.broadcastDelivery.findMany({
      where: { broadcastId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async replyToSubscriber(subscriberId: string, text: string) {
    const subscriber = await this.prisma.telegramSubscriber.findUnique({ where: { id: subscriberId } });
    if (!subscriber) throw new NotFoundException('Подписчик не найден');

    const message = text.trim();
    if (!message) throw new BadRequestException('Текст ответа обязателен');
    if (!this.telegram.isEnabled()) throw new BadRequestException('Telegram bot не запущен');

    await this.telegram.sendBroadcastMessage(subscriber.chatId, message);
    return { ok: true, subscriberId };
  }
}

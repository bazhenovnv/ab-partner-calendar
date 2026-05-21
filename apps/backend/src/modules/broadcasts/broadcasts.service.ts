import { BadRequestException, Injectable } from '@nestjs/common';
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
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(dto: { title?: string; text?: string }) {
    const title = dto.title?.trim();
    const text = dto.text?.trim();

    if (!title) throw new BadRequestException('Укажите заголовок рассылки.');
    if (!text) throw new BadRequestException('Укажите текст рассылки.');

    return this.prisma.broadcast.create({
      data: { title, text, status: 'DRAFT' },
      include: { _count: { select: { deliveries: true } } },
    });
  }

  update(id: string, dto: { title?: string; text?: string }) {
    const data: { title?: string; text?: string; status?: string } = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.text !== undefined) data.text = dto.text.trim();
    data.status = 'DRAFT';

    return this.prisma.broadcast.update({
      where: { id },
      data,
      include: { _count: { select: { deliveries: true } } },
    });
  }

  async send(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new BadRequestException('Рассылка не найдена.');

    const subscribers = await this.prisma.telegramSubscriber.findMany({ where: { isActive: true } });

    await this.prisma.broadcast.update({
      where: { id },
      data: { status: 'SENDING', sentCount: 0, failedCount: 0, sentAt: null },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const subscriber of subscribers) {
      try {
        await this.telegram.sendBroadcastMessage(subscriber.chatId, broadcast.text);
        sentCount += 1;

        await this.prisma.broadcastDelivery.create({
          data: {
            broadcastId: broadcast.id,
            subscriberId: subscriber.id,
            chatId: subscriber.chatId,
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch (error) {
        failedCount += 1;
        const message = error instanceof Error ? error.message : String(error);

        await this.prisma.broadcastDelivery.create({
          data: {
            broadcastId: broadcast.id,
            subscriberId: subscriber.id,
            chatId: subscriber.chatId,
            status: 'FAILED',
            error: message.slice(0, 500),
          },
        });

        if (message.includes('403') || message.toLowerCase().includes('bot was blocked')) {
          await this.prisma.telegramSubscriber.update({
            where: { id: subscriber.id },
            data: { isActive: false },
          });
        }
      }
    }

    return this.prisma.broadcast.update({
      where: { id },
      data: {
        status: 'SENT',
        sentCount,
        failedCount,
        sentAt: new Date(),
      },
      include: { _count: { select: { deliveries: true } } },
    });
  }

  deliveries(id: string) {
    return this.prisma.broadcastDelivery.findMany({
      where: { broadcastId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { subscriber: true },
    });
  }
}

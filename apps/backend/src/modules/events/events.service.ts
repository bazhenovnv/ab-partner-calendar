import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  // ✔ главный метод, который ломался
  async listPublished(date?: string, limit = 100) {
    const where: any = { published: true };

    if (date) {
      const d = new Date(date);
      where.startAt = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    return this.prisma.event.findMany({
      where,
      take: limit,
      orderBy: { startAt: 'asc' }, // ❗ фикс вместо date
    });
  }
}
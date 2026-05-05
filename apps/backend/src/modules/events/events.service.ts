import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async listPublished(date?: string, limit = 50) {
    const where: any = { published: true };

    return this.prisma.event.findMany({
      where,
      take: limit,
      orderBy: { startAt: 'asc' },
    });
  }
}
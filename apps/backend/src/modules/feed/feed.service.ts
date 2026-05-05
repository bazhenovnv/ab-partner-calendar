import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async getFeed() {
    const events = await this.prisma.event.findMany({
      where: { published: true },
      orderBy: { startAt: 'asc' },
    });

    return events;
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class EventParserService {
  constructor(private prisma: PrismaService) {}

  async getLatestEvents() {
    return this.prisma.event.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }

  async getPopularEvents() {
    return this.prisma.event.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
  }

  async getAllEvents() {
    return this.prisma.event.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
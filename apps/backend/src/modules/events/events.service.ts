import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  private withComputedStatus(event: any) {
    return {
      ...event,
      status: event.date > new Date() ? 'upcoming' : 'past',
    };
  }

  async getAll() {
    const events: any[] = await this.prisma.event.findMany({
      orderBy: { date: 'asc' },
    });

    return events.map((event: any) => this.withComputedStatus(event));
  }

  async getFeed() {
    const events: any[] = await this.prisma.event.findMany({
      orderBy: { date: 'asc' },
    });

    return events.map((event: any) => this.withComputedStatus(event));
  }

  async grouped() {
    const events: any[] = await this.prisma.event.findMany({
      orderBy: { date: 'asc' },
    });

    const now = new Date();

    return {
      upcoming: events
        .filter((event: any) => new Date(event.date) >= now)
        .slice(0, 4)
        .map((event: any) => ({
          id: event.id,
          title: event.title,
        })),

      past: events
        .filter((event: any) => new Date(event.date) < now)
        .slice(0, 4)
        .map((event: any) => ({
          id: event.id,
          title: event.title,
        })),
    };
  }
}

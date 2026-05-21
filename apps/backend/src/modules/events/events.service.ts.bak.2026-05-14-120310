import { Injectable } from '@nestjs/common';
import { Event } from '@prisma/client';
import { PrismaService } from '../../services/prisma.service';

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async listPublished(date?: string, limit = 200) {
    const where: any = { published: true };

    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      where.startAt = { gte: start, lte: end };
    }

    return this.prisma.event.findMany({
      where,
      take: limit,
      include: { category: true },
      orderBy: { startAt: 'asc' },
    });
  }

  async listHighlights(limit = 12) {
    return this.prisma.event.findMany({
      where: {
        published: true,
        isImportant: true,
      },
      take: limit,
      include: { category: true },
      orderBy: { startAt: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.event.findUnique({
      where: { slug },
      include: { category: true },
    });
  }

  toIcs(event: Event) {
    const start = toIcsDate(event.startAt);
    const end = toIcsDate(event.endAt);
    const created = toIcsDate(event.createdAt);
    const updated = toIcsDate(event.updatedAt);
    const summary = escapeIcs(event.title);
    const description = escapeIcs(event.descriptionFull || event.descriptionShort || event.title);
    const location = escapeIcs(event.location || 'Онлайн');
    const url = event.sourceUrl || 'https://t.me/ab_afisha_buh';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AB Afisha Buhgaltera//Calendar//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@ab-event.pro`,
      `DTSTAMP:${updated}`,
      `CREATED:${created}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `URL:${url}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }
}

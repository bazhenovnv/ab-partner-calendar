import { Injectable, NotFoundException } from '@nestjs/common';
import { endOfDay, isAfter, isBefore, startOfDay } from 'date-fns';
import { PrismaService } from '../../services/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly topicMap = [
    { slug: '54-fz', title: '54-ФЗ', patterns: ['54-ФЗ', '54 ФЗ', '#54ФЗ'] },
    { slug: '1c', title: '1С', patterns: ['1С', '#1С'] },
    { slug: 'ofd', title: 'ОФД', patterns: ['ОФД', '#ОФД'] },
    { slug: 'egais', title: 'ЕГАИС', patterns: ['ЕГАИС', '#ЕГАИС'] },
    { slug: 'marking', title: 'Маркировка', patterns: ['маркиров', 'Честный знак', '#Маркировка'] },
  ];

  private withComputedStatus<T extends { startAt: Date; endAt: Date }>(event: T) {
    const now = new Date();
    let runtimeStatus: 'SCHEDULED' | 'LIVE' | 'COMPLETED' = 'SCHEDULED';

    if (isBefore(now, event.endAt) && isAfter(now, event.startAt)) {
      runtimeStatus = 'LIVE';
    } else if (isAfter(now, event.endAt)) {
      runtimeStatus = 'COMPLETED';
    }

    return { ...event, runtimeStatus };
  }

  async listPublished(date?: string, limit = 100) {
    const where: any = { published: true };

    if (date) {
      const day = new Date(date);
      where.startAt = { gte: startOfDay(day), lte: endOfDay(day) };
    }

    const events = await this.prisma.event.findMany({
      where,
      take: limit,
      orderBy: { startAt: 'asc' },
      include: { category: true },
    });

    return events.map((event) => this.withComputedStatus(event));
  }

  async listHighlights() {
    const events = await this.prisma.event.findMany({
      where: {
        published: true,
        isImportant: true,
        startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { startAt: 'asc' },
      take: 6,
      include: { category: true },
    });

    return events.map((event) => this.withComputedStatus(event));
  }

  async detailBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!event) throw new NotFoundException('Мероприятие не найдено');
    return this.withComputedStatus(event);
  }

  async listAdmin() {
    return this.prisma.event.findMany({
      orderBy: { startAt: 'desc' },
      include: { category: true },
    });
  }

  async create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? 'SCHEDULED',
        published: dto.published ?? true,
        isImportant: dto.isImportant ?? false,
        tags: dto.tags ?? [],
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  async topicCollections() {
    const events = await this.prisma.event.findMany({
      where: { published: true },
      orderBy: { startAt: 'asc' },
    });

    return this.topicMap.map((topic) => {
      const items = events.filter((event) => {
        const haystack = `${event.title} ${event.descriptionShort} ${event.descriptionFull} ${event.tags.join(' ')}`.toLowerCase();
        return topic.patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
      });

      return {
        slug: topic.slug,
        title: topic.title,
        count: items.length,
        events: items.slice(0, 4).map((event) => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          startAt: event.startAt,
          location: event.location,
          format: event.format,
          isImportant: event.isImportant,
        })),
      };
    });
  }

  async exportIcs(slug: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');

    const formatDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const esc = (value: string) =>
      value
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AB Partner//Calendar//RU',
      'BEGIN:VEVENT',
      `UID:${event.id}@ab-partner.local`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(event.startAt)}`,
      `DTEND:${formatDate(event.endAt)}`,
      `SUMMARY:${esc(event.title)}`,
      `DESCRIPTION:${esc(event.descriptionShort || event.descriptionFull)}`,
      `LOCATION:${esc(event.location || 'Онлайн')}`,
      `URL:${esc(event.sourceUrl || 'https://t.me/ab_afisha_buh')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}

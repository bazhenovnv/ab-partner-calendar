import { Injectable, NotFoundException } from '@nestjs/common';
import { Event } from '@prisma/client';
import { PrismaService } from '../../services/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto';

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

function runtimeStatus(event: { status: string; startAt: Date; endAt: Date }) {
  const now = new Date();
  if (event.status === 'COMPLETED' || event.endAt < now) return 'COMPLETED';
  if (event.status === 'LIVE' || (event.startAt <= now && event.endAt >= now)) return 'LIVE';
  return 'SCHEDULED';
}

function withRuntimeStatus<T extends { status: string; startAt: Date; endAt: Date }>(event: T) {
  return { ...event, runtimeStatus: runtimeStatus(event) };
}

function compactUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, current]) => current !== undefined)) as Partial<T>;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(date?: string, limit = 200) {
    const where: any = { published: true, deletedAt: null };

    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      where.startAt = { gte: start, lte: end };
    }

    const events = await this.prisma.event.findMany({
      where,
      take: limit,
      include: { category: true, _count: { select: { reminders: true } } },
      orderBy: { startAt: 'asc' },
    });

    return events.map(withRuntimeStatus);
  }

  async listAdmin(includeDeleted = false) {
    const events = await this.prisma.event.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      include: { category: true, _count: { select: { reminders: true } } },
      orderBy: { startAt: 'desc' },
    });

    return events.map(withRuntimeStatus);
  }

  async listHighlights(limit = 12) {
    const events = await this.prisma.event.findMany({
      where: {
        published: true,
        isImportant: true,
        deletedAt: null,
      },
      take: limit,
      include: { category: true, _count: { select: { reminders: true } } },
      orderBy: { startAt: 'asc' },
    });

    return events.map(withRuntimeStatus);
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findFirst({
      where: { slug, deletedAt: null, published: true },
      include: { category: true, _count: { select: { reminders: true } } },
    });

    return event ? withRuntimeStatus(event) : null;
  }

  async create(dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        descriptionShort: dto.descriptionShort,
        descriptionFull: dto.descriptionFull,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        location: dto.location,
        format: dto.format,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl || null,
        source: dto.source || 'MANUAL',
        sourceUrl: dto.sourceUrl || null,
        sourcePostId: dto.sourcePostId || null,
        isImportant: dto.isImportant ?? false,
        status: dto.status || 'SCHEDULED',
        published: dto.published ?? true,
        tags: dto.tags || [],
        deletedAt: null,
      },
      include: { category: true, _count: { select: { reminders: true } } },
    });

    return withRuntimeStatus(event);
  }

  async update(id: string, dto: UpdateEventDto) {
    const data = compactUndefined({
      title: dto.title,
      slug: dto.slug,
      descriptionShort: dto.descriptionShort,
      descriptionFull: dto.descriptionFull,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      location: dto.location,
      format: dto.format,
      categoryId: dto.categoryId,
      imageUrl: dto.imageUrl === '' ? null : dto.imageUrl,
      source: dto.source === '' ? null : dto.source,
      sourceUrl: dto.sourceUrl === '' ? null : dto.sourceUrl,
      sourcePostId: dto.sourcePostId === '' ? null : dto.sourcePostId,
      isImportant: dto.isImportant,
      status: dto.status,
      published: dto.published,
      tags: dto.tags,
    });

    try {
      const event = await this.prisma.event.update({
        where: { id },
        data,
        include: { category: true, _count: { select: { reminders: true } } },
      });
      return withRuntimeStatus(event);
    } catch {
      throw new NotFoundException('Event not found');
    }
  }

  async remove(id: string) {
    try {
      const event = await this.prisma.event.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          published: false,
        },
        include: { category: true, _count: { select: { reminders: true } } },
      });
      return withRuntimeStatus(event);
    } catch {
      throw new NotFoundException('Event not found');
    }
  }

  async restore(id: string) {
    try {
      const event = await this.prisma.event.update({
        where: { id },
        data: {
          deletedAt: null,
          published: true,
          status: 'SCHEDULED',
        },
        include: { category: true, _count: { select: { reminders: true } } },
      });
      return withRuntimeStatus(event);
    } catch {
      throw new NotFoundException('Event not found');
    }
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

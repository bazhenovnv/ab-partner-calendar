import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PrismaService } from '../../services/prisma.service';

type AnalyticsEvent = {
  startAt: Date;
  endAt: Date;
  status: string;
  isImportant: boolean;
  location: string | null;
  tags: string[];
  category?: { title: string } | null;
};

type CountRow = { _count: { _all: number } };
type PathCountRow = CountRow & { path: string };
type CityCountRow = CountRow & { city: string | null };

function normalizeCity(location?: string | null) {
  if (!location) return 'Онлайн';
  const value = location.trim();
  if (/онлайн|zoom|webinar|вебинар/i.test(value)) return 'Онлайн';
  return value.split(',')[0]?.trim() || 'Не указан';
}

function countBy<T>(items: T[], getKey: (item: T) => string | string[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const keys = getKey(item);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const normalized = key?.trim() || 'Не указано';
      map.set(normalized, (map.get(normalized) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async summary() {
    const now = new Date();
    const startOf7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const events = await this.prisma.event.findMany({ where: { deletedAt: null, published: true }, include: { category: true } }) as AnalyticsEvent[];
    const [visitsTotal, visits7d, visits30d, uniqueRows, topPathRowsRaw, visitCityRowsRaw] = await Promise.all([
      this.prisma.visitHit.count(),
      this.prisma.visitHit.count({ where: { createdAt: { gte: startOf7d } } }),
      this.prisma.visitHit.count({ where: { createdAt: { gte: startOf30d } } }),
      this.prisma.visitHit.groupBy({ by: ['anonId'] }),
      this.prisma.visitHit.groupBy({ by: ['path'], _count: { _all: true } }),
      this.prisma.visitHit.groupBy({ by: ['city'], _count: { _all: true } }),
    ]);

    const topPathRows = (topPathRowsRaw as unknown as PathCountRow[]).sort((a, b) => b._count._all - a._count._all).slice(0, 10);
    const visitCityRows = (visitCityRowsRaw as unknown as CityCountRow[]).sort((a, b) => b._count._all - a._count._all).slice(0, 10);

    const byCity = countBy(events, (event) => normalizeCity(event.location)).map(({ key, count }) => ({ city: key, count })).slice(0, 12);
    const byTopic = countBy(events, (event) => event.tags?.length ? event.tags : event.category?.title || 'Без категории').map(({ key, count }) => ({ topic: key, count })).slice(0, 12);

    return {
      byCity,
      byTopic,
      totals: {
        upcoming: events.filter((event) => event.startAt > now && event.status === 'SCHEDULED').length,
        live: events.filter((event) => event.status === 'LIVE').length,
        completed: events.filter((event) => event.status === 'COMPLETED' || event.endAt < now).length,
        highlighted: events.filter((event) => event.isImportant).length,
      },
      attendance: {
        visitsTotal,
        visits7d,
        visits30d,
        uniqueVisitors: (uniqueRows as unknown[]).length,
        topPaths: topPathRows.map((row) => ({ path: row.path, count: row._count._all })),
        byVisitCity: visitCityRows.map((row) => ({ city: row.city || 'Не указан', count: row._count._all })),
      },
    };
  }
}

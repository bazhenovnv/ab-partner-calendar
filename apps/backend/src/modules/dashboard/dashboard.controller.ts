import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { subDays } from 'date-fns';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PrismaService } from '../../services/prisma.service';

function rankMap(map: Map<string, number>, keyName: 'city' | 'topic' | 'path') {
  return Array.from(map.entries())
    .map(([name, count]) => ({ [keyName]: name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

@Controller()
export class PublicMetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('public/visit')
  async trackVisit(
    @Body() body: { anonId?: string; path?: string; source?: string; city?: string },
    @Headers('user-agent') userAgent?: string,
  ) {
    const anonId = (body?.anonId || 'anonymous').slice(0, 80);
    const path = (body?.path || '/').slice(0, 120);
    const source = body?.source?.slice(0, 120);
    const city = body?.city?.slice(0, 120);

    await this.prisma.visitHit.create({
      data: {
        anonId,
        path,
        source,
        city,
        userAgent: userAgent?.slice(0, 300),
      },
    });

    return { tracked: true };
  }
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async stats() {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [events, imports, reminders, users, visitsTotal, visits7d, visitsToday, uniqueVisitors] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.telegramImport.count(),
      this.prisma.reminder.count(),
      this.prisma.user.count(),
      this.prisma.visitHit.count(),
      this.prisma.visitHit.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.visitHit.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.visitHit.findMany({ distinct: ['anonId'], select: { anonId: true } }).then((rows) => rows.length),
    ]);

    return { events, imports, reminders, users, visitsTotal, visits7d, visitsToday, uniqueVisitors };
  }

  @Get('analytics')
  async analytics() {
    const events = await this.prisma.event.findMany();
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);
    const byCityMap = new Map<string, number>();
    const topics = ['54-ФЗ', '1С', 'ОФД', 'ЕГАИС', 'маркировка', 'Налоги', 'Отчетность', 'Кадры'];
    const byTopicMap = new Map<string, number>(topics.map((t) => [t, 0]));
    let upcoming = 0;
    let live = 0;
    let completed = 0;
    let highlighted = 0;

    for (const event of events) {
      const cityMatch = ['Москва', 'Санкт-Петербург', 'Краснодар', 'Екатеринбург', 'Новосибирск', 'Казань', 'Ростов-на-Дону', 'Самара', 'Уфа', 'Челябинск', 'Воронеж']
        .find((city) => (event.location || '').toLowerCase().includes(city.toLowerCase()))
        || ((event.location || '').toLowerCase().includes('онлайн') ? 'Онлайн' : 'Не указан');
      byCityMap.set(cityMatch, (byCityMap.get(cityMatch) || 0) + 1);

      const haystack = `${event.title} ${event.descriptionShort} ${event.descriptionFull} ${event.tags.join(' ')}`.toLowerCase();
      for (const topic of topics) {
        if (haystack.includes(topic.toLowerCase())) {
          byTopicMap.set(topic, (byTopicMap.get(topic) || 0) + 1);
        }
      }

      if (event.isImportant) highlighted += 1;
      if (event.endAt < now) completed += 1;
      else if (event.startAt <= now && event.endAt >= now) live += 1;
      else upcoming += 1;
    }

    const [visitsAll, visitsRecent, uniqueVisitors] = await Promise.all([
      this.prisma.visitHit.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.visitHit.findMany({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.visitHit.findMany({ distinct: ['anonId'], select: { anonId: true } }).then((rows) => rows.length),
    ]);

    const pathMap = new Map<string, number>();
    const visitCityMap = new Map<string, number>();
    for (const visit of visitsAll) {
      pathMap.set(visit.path || '/', (pathMap.get(visit.path || '/') || 0) + 1);
      visitCityMap.set(visit.city || 'Не указан', (visitCityMap.get(visit.city || 'Не указан') || 0) + 1);
    }

    return {
      byCity: rankMap(byCityMap, 'city') as { city: string; count: number }[],
      byTopic: rankMap(byTopicMap, 'topic') as { topic: string; count: number }[],
      totals: { upcoming, live, completed, highlighted },
      attendance: {
        visitsTotal: visitsAll.length,
        visits7d: visitsAll.filter((visit) => visit.createdAt >= weekAgo).length,
        visits30d: visitsRecent.length,
        uniqueVisitors,
        topPaths: rankMap(pathMap, 'path') as { path: string; count: number }[],
        byVisitCity: rankMap(visitCityMap, 'city') as { city: string; count: number }[],
      },
    };
  }
}

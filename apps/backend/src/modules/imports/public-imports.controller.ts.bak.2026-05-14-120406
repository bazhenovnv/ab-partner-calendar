import { Body, Controller, Get, Post } from '@nestjs/common';
import { SourceConnectorsService } from './source-connectors.service';
import { PrismaService } from '../../services/prisma.service';

@Controller('public')
export class PublicImportsController {
  constructor(
    private readonly connectors: SourceConnectorsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sync')
  sync() {
    return this.connectors.syncAll();
  }

  @Get('connectors')
  listConnectors() {
    return this.connectors.listConnectors();
  }

  @Get('collections')
  async collections() {
    const categories = await this.prisma.category.findMany({
      orderBy: { title: 'asc' },
      include: {
        events: {
          where: { published: true },
          orderBy: { startAt: 'asc' },
          take: 6,
        },
      },
    });

    return categories
      .filter((category) => category.events.length > 0)
      .map((category) => ({
        id: category.id,
        title: category.title,
        slug: category.slug,
        count: category.events.length,
        events: category.events,
      }));
  }

  @Post('visit')
  async trackVisit(@Body() body: { anonId?: string; path?: string; city?: string; source?: string; userAgent?: string }) {
    await this.prisma.visitHit.create({
      data: {
        anonId: body.anonId || 'anonymous',
        path: body.path || '/',
        city: body.city || null,
        source: body.source || 'web-app',
        userAgent: body.userAgent || null,
      },
    });

    return { tracked: true };
  }
}

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const visitsAll: any[] = await this.prisma.visitHit.findMany();

    return {
      totalVisits: visitsAll.length,
      uniqueVisitors: await this.prisma.visitHit
        .findMany({
          distinct: ['anonId'],
          select: { anonId: true },
        })
        .then((rows: any[]) => rows.length),

      visits7d: visitsAll.filter((visit: any) => visit.createdAt >= weekAgo)
        .length,
    };
  }
}

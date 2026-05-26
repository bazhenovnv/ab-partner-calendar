import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PrismaService } from '../../services/prisma.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOf7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [events, publishedEvents, deletedEvents, importsCount, pendingImports, reminders, users, visitsTotal, visits7d, visitsToday, uniqueRows] = await Promise.all([
      this.prisma.event.count({ where: { deletedAt: null } }),
      this.prisma.event.count({ where: { deletedAt: null, published: true } }),
      this.prisma.event.count({ where: { deletedAt: { not: null } } }),
      this.prisma.telegramImport.count(),
      this.prisma.telegramImport.count({ where: { status: { in: ['NEW', 'REVIEW'] } } }),
      this.prisma.reminder.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.visitHit.count(),
      this.prisma.visitHit.count({ where: { createdAt: { gte: startOf7d } } }),
      this.prisma.visitHit.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.visitHit.groupBy({ by: ['anonId'] }),
    ]);

    return {
      events,
      publishedEvents,
      deletedEvents,
      imports: importsCount,
      pendingImports,
      reminders,
      users,
      visitsTotal,
      visits7d,
      visitsToday,
      uniqueVisitors: uniqueRows.length,
    };
  }
}

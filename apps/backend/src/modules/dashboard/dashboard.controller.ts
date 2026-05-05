import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getStats() {
    const eventsCount = await this.prisma.event.count();

    return {
      events: eventsCount,
    };
  }
}
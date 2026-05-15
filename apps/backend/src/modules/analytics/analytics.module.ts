import { Module } from '@nestjs/common';
import { PrismaModule } from '../../services/prisma.module';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

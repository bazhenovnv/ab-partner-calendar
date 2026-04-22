import { Module } from '@nestjs/common';
import { DashboardController, PublicMetricsController } from './dashboard.controller';

@Module({ controllers: [DashboardController, PublicMetricsController] })
export class DashboardModule {}

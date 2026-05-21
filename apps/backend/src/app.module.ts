import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EventsModule } from './modules/events/events.module';
import { FeedModule } from './modules/feed/feed.module';
import { ImportsModule } from './modules/imports/imports.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './services/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    BroadcastsModule,
    CategoriesModule,
    EventsModule,
    FeedModule,
    AiModule,
    TelegramModule,
    ImportsModule,
    RemindersModule,
    DashboardModule,
    AnalyticsModule,
  ],
})
export class AppModule {}

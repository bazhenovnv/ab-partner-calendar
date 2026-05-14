import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventsModule } from './modules/events/events.module';
import { FeedModule } from './modules/feed/feed.module';
import { AiModule } from './modules/ai/ai.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { ImportsModule } from './modules/imports/imports.module';
import { PrismaModule } from './services/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventsModule,
    FeedModule,
    AiModule,
    TelegramModule,
    ImportsModule,
  ],
})
export class AppModule {}

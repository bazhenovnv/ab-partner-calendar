import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventsModule } from './modules/events/events.module';
import { FeedModule } from './modules/feed/feed.module';
import { AiModule } from './modules/ai/ai.module';
import { TelegramModule } from './modules/telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventsModule,
    FeedModule,
    AiModule,
    TelegramModule,
  ],
})
export class AppModule {}
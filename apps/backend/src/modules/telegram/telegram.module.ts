import { Module } from '@nestjs/common';
import { TelegramSyncService } from './telegram-sync.service';
import { AiModule } from '../ai/ai.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [AiModule, EventsModule],
  providers: [TelegramSyncService],
})
export class TelegramModule {}
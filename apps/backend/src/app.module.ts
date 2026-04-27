import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiParserService } from './services/ai-parser.service';
import { TelegramSyncService } from './services/telegram-sync.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../../.env',
    }),
  ],
  providers: [AiParserService, TelegramSyncService],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../services/prisma.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../services/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [BroadcastsController],
  providers: [BroadcastsService],
})
export class BroadcastsModule {}

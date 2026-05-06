import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { PrismaModule } from '../../services/prisma.module';

@Module({
  imports: [PrismaModule], // 🔥 ВОТ ЭТО ГЛАВНОЕ
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

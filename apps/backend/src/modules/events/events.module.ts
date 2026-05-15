import { Module } from '@nestjs/common';
import { PrismaModule } from '../../services/prisma.module';
import { AdminEventsController } from './admin-events.controller';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController, AdminEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

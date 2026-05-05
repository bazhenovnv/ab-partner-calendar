import { Controller, Get, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Query('date') date?: string) {
    return this.events.listPublished(date, 50);
  }
}
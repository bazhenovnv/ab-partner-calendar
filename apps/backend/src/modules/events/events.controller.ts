import { Controller, Get, Header, NotFoundException, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('highlights')
  listHighlights() {
    return this.events.listHighlights();
  }

  @Get(':slug/ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="event.ics"')
  async exportIcs(@Param('slug') slug: string) {
    const event = await this.events.findBySlug(slug);
    if (!event) throw new NotFoundException('Event not found');
    return this.events.toIcs(event);
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const event = await this.events.findBySlug(slug);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  @Get()
  list(@Query('date') date?: string) {
    return this.events.listPublished(date);
  }
}

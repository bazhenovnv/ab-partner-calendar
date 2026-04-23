import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { QueryEventsDto } from './dto';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Query() query: QueryEventsDto) {
    return this.events.listPublished(query.date, query.limit);
  }

  @Get('highlights')
  highlights() {
    return this.events.listHighlights();
  }

  @Get('by-date')
  byDate(@Query('date') date: string) {
    return this.events.listPublished(date, 50);
  }

  @Get('collections/topics')
  collections() {
    return this.events.topicCollections();
  }

  @Get('id/:id')
  detailById(@Param('id') id: string) {
    return this.events.detailById(id);
  }

  @Get(':slug/ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename=event.ics')
  async ics(@Param('slug') slug: string) {
    return this.events.exportIcs(slug);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.events.detailBySlug(slug);
  }
}

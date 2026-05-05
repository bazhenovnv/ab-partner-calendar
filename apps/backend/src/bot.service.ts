import { Injectable } from '@nestjs/common';
import { FeedService } from './modules/feed/feed.service';
import { EventsService } from './modules/events/events.service';

@Injectable()
export class BotService {
  constructor(
    private readonly feedService: FeedService,
    private readonly eventsService: EventsService,
  ) {}

  async getFeed() {
    return this.feedService.getFeed();
  }

  async getEvents(date?: string) {
    return this.eventsService.listPublished(date, 20);
  }
}
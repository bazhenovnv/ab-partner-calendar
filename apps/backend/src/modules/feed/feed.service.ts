import { Injectable } from '@nestjs/common';
import { EventsService } from '../events/events.service';

@Injectable()
export class FeedService {
  constructor(private events: EventsService) {}

  async getFeed() {
    const events = await this.events.listPublished(undefined, 20);

    return {
      items: events,
      total: events.length,
    };
  }
}
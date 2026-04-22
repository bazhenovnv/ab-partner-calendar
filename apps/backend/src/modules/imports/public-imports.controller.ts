import { Controller, Get, Post } from '@nestjs/common';
import { SourceConnectorsService } from './source-connectors.service';
import { EventsService } from '../events/events.service';

@Controller('public')
export class PublicImportsController {
  constructor(private readonly connectors: SourceConnectorsService, private readonly events: EventsService) {}

  @Post('sync')
  sync() {
    return this.connectors.syncAll();
  }

  @Get('connectors')
  listConnectors() {
    return this.connectors.listConnectors();
  }
}

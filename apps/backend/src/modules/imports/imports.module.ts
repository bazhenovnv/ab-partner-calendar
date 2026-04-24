import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { ImportsController } from './imports.controller';
import { PublicImportsController } from './public-imports.controller';
import { SourceConnectorsService } from './source-connectors.service';

@Module({
  imports: [EventsModule],
  controllers: [ImportsController, PublicImportsController],
  providers: [SourceConnectorsService],
})
export class ImportsModule {}

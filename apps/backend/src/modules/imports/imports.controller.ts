import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { SourceConnectorsService } from './source-connectors.service';

@Controller('admin/imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly connectors: SourceConnectorsService) {}

  @Get()
  list() {
    return this.connectors.listImports();
  }

  @Get('connectors')
  listConnectors() {
    return this.connectors.listConnectors();
  }

  @Post('sync')
  sync() {
    return this.connectors.syncAll();
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.connectors.confirm(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.connectors.reject(id);
  }
}

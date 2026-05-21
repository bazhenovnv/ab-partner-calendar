import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { BroadcastsService } from './broadcasts.service';

@Controller('admin/broadcasts')
@UseGuards(JwtAuthGuard)
export class BroadcastsController {
  constructor(private readonly broadcasts: BroadcastsService) {}

  @Get()
  list() {
    return this.broadcasts.list();
  }

  @Get('subscribers')
  subscribers() {
    return this.broadcasts.subscribers();
  }

  @Post()
  create(@Body() body: { title?: string; text?: string }) {
    return this.broadcasts.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; text?: string }) {
    return this.broadcasts.update(id, body);
  }

  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.broadcasts.send(id);
  }

  @Get(':id/deliveries')
  deliveries(@Param('id') id: string) {
    return this.broadcasts.deliveries(id);
  }
}

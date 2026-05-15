import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CreateEventDto, UpdateEventDto } from './dto';
import { EventsService } from './events.service';

@Controller('admin/events')
@UseGuards(JwtAuthGuard)
export class AdminEventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list() {
    return this.events.listAdmin();
  }

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.events.remove(id);
    return { deleted: true, id };
  }
}

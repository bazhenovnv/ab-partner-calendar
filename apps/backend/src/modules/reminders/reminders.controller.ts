import { Body, Controller, Post } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto';
@Controller('reminders')
export class RemindersController { constructor(private readonly reminders: RemindersService) {} @Post() create(@Body() dto: CreateReminderDto) { return this.reminders.create(dto); } }

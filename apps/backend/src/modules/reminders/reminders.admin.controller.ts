import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RemindersService } from './reminders.service';
@Controller('admin/reminders')
@UseGuards(JwtAuthGuard)
export class AdminRemindersController { constructor(private readonly reminders: RemindersService) {} @Get() list() { return this.reminders.listAdmin(); } }

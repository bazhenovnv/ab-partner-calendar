import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { AdminRemindersController } from './reminders.admin.controller';
import { RemindersService } from './reminders.service';
@Module({ controllers: [RemindersController, AdminRemindersController], providers: [RemindersService] })
export class RemindersModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../services/prisma.module';
import { AdminRemindersController } from './reminders.admin.controller';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [PrismaModule],
  controllers: [RemindersController, AdminRemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}

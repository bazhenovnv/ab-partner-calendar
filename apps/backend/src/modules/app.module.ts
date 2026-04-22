import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { RemindersModule } from './reminders/reminders.module';
import { ImportsModule } from './imports/imports.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../../.env' }), PrismaModule, AuthModule, EventsModule, CategoriesModule, RemindersModule, ImportsModule, UsersModule, DashboardModule] })
export class AppModule {}

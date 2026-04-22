import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { CreateReminderDto } from './dto';
@Injectable()
export class RemindersService { constructor(private readonly prisma: PrismaService) {} async create(dto: CreateReminderDto) { return this.prisma.reminder.upsert({ where: { eventId_telegramUserId_remindBefore: { eventId: dto.eventId, telegramUserId: dto.telegramUserId, remindBefore: dto.remindBefore } }, update: { telegramUsername: dto.telegramUsername, isActive: true }, create: dto }); } listAdmin() { return this.prisma.reminder.findMany({ include: { event: true }, orderBy: { createdAt: 'desc' } }); } }

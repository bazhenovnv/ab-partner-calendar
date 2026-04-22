import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
export class CreateReminderDto { @IsUUID() eventId!: string; @IsString() telegramUserId!: string; @IsOptional() @IsString() telegramUsername?: string; @IsIn(['5m','15m','30m','1h','1d']) remindBefore!: '5m'|'15m'|'30m'|'1h'|'1d'; }

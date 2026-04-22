import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export const EVENT_FORMATS = ['ONLINE', 'OFFLINE', 'HYBRID'] as const;
export type EventFormatValue = (typeof EVENT_FORMATS)[number];
export const EVENT_STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED'] as const;
export type EventStatusValue = (typeof EVENT_STATUSES)[number];

export class QueryEventsDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  descriptionShort!: string;

  @IsString()
  descriptionFull!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsString()
  location!: string;

  @IsIn(EVENT_FORMATS)
  format!: EventFormatValue;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;

  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: EventStatusValue;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateEventDto extends CreateEventDto {}

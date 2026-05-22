import { IsOptional, IsString, IsInt, IsBoolean, Min, IsEnum } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class UpdateCoreDataDto {
  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  ticketType?: string | null;

  @IsOptional()
  @IsString()
  serviceContract?: string | null;

  @IsOptional()
  @IsString()
  firewallCategory?: string | null;

  @IsOptional()
  @IsString()
  criticality?: string | null;

  @IsOptional()
  @IsString()
  customerName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentTracking?: number;

  @IsOptional()
  @IsBoolean()
  isScopeInScope?: boolean;

  @IsOptional()
  @IsString()
  affectedDevice?: string | null;

  @IsOptional()
  @IsString()
  deviceIp?: string | null;

  @IsOptional()
  @IsString()
  queueId?: string | null;

  @IsOptional()
  @IsString()
  slaId?: string | null;

  @IsOptional()
  @IsString()
  ticketOwnerId?: string | null;

  @IsOptional()
  @IsString()
  ticketSource?: string | null;

  @IsOptional()
  @IsString()
  status?: string | null;
}

import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { TicketStatus, SubStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsEnum(SubStatus)
  subStatus?: SubStatus;
}

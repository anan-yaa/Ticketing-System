import { IsOptional, IsEnum } from 'class-validator';
import { TicketStatus, SubStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(SubStatus)
  subStatus?: SubStatus;
}

import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTicketDto {
  // ── Core Ticket Identity ─────────────────────────────────────────────────
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  ticketSource?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // ── Scheduling ───────────────────────────────────────────────────────────
  @IsOptional()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  executeAt?: string | Date;

  // ── Core Classification (merged from Add Core Data panel) ─────────────────
  @IsOptional()
  @IsString()
  ticketType?: string;

  @IsOptional()
  @IsString()
  queueId?: string;

  @IsOptional()
  @IsString()
  firewallCategory?: string;

  @IsOptional()
  @IsBoolean()
  isScopeInScope?: boolean;

  @IsOptional()
  @IsString()
  customerName?: string;

  /**
   * Priority accepts any case (e.g. "high", "HIGH").
   * The service layer normalises to uppercase before writing to Prisma.
   */
  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  ticketOwnerId?: string;

  @IsOptional()
  @IsString()
  affectedDevice?: string;

  @IsOptional()
  @IsString()
  deviceIp?: string;
}


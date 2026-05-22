import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { SlaService } from './sla.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, SlaService],
})
export class TicketsModule {}

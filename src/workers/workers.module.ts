import { Module } from '@nestjs/common';
import { TicketSchedulerService } from './ticket-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TicketSchedulerService],
})
export class WorkersModule {}

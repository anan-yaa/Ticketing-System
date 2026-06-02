import { Module } from '@nestjs/common';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduledTasksController],
  providers: [ScheduledTasksService],
})
export class ScheduledTasksModule {}

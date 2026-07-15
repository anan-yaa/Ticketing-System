import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { RolesModule } from './roles/roles.module';
import { MasterConfigModule } from './master-config/master-config.module';
import { WorkersModule } from './workers/workers.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { VectorModule } from './ai/vector.module';
import { AiModule } from './ai/ai.module';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule, 
    AuthModule, 
    UsersModule, 
    TicketsModule,
    AuditLogModule,
    RolesModule,
    MasterConfigModule,
    WorkersModule,
    ScheduledTasksModule,
    VectorModule,
    AiModule
  ],
})
export class AppModule {}

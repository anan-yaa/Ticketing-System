import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { RolesModule } from './roles/roles.module';
import { MasterConfigModule } from './master-config/master-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, 
    AuthModule, 
    UsersModule, 
    TicketsModule,
    AuditLogModule,
    RolesModule,
    MasterConfigModule
  ],
})
export class AppModule {}

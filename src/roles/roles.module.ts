import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService],
})
export class RolesModule {}

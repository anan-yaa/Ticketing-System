import { Module } from '@nestjs/common';
import { MasterConfigController } from './master-config.controller';
import { MasterConfigService } from './master-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MasterConfigController],
  providers: [MasterConfigService],
  exports: [MasterConfigService],
})
export class MasterConfigModule {}

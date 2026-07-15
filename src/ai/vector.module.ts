import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { VectorService } from './vector.service';
import { KnowledgeBaseSeederService } from './knowledge-base-seeder.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { CoPilotService } from './co-pilot.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [KnowledgeBaseController],
  providers: [VectorService, KnowledgeBaseSeederService, CoPilotService],
  exports: [VectorService, KnowledgeBaseSeederService, CoPilotService],
})
export class VectorModule {}

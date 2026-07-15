import { Module, Global } from '@nestjs/common';
import { VectorModule } from './vector.module';
import { CoPilotController } from './co-pilot.controller';
import { CoPilotService } from './co-pilot.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseSeederService } from './knowledge-base-seeder.service';
import { VectorService } from './vector.service';

@Global()
@Module({
  imports: [VectorModule],
  controllers: [CoPilotController],
  exports: [VectorModule],
})
export class AiModule {}

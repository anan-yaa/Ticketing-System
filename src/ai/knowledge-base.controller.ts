import { Controller, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { KnowledgeBaseSeederService, IngestionResult } from './knowledge-base-seeder.service';

@Controller('ai/knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly seederService: KnowledgeBaseSeederService) {}

  /**
   * Development router endpoint to trigger historical ticket ingestion into the Vector DB.
   * Example: POST /ai/knowledge-base/seed?batchSize=50
   */
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedHistoricalTickets(@Query('batchSize') batchSizeParam?: string): Promise<IngestionResult> {
    const batchSize = batchSizeParam ? parseInt(batchSizeParam, 10) : 100;
    return this.seederService.seedHistoricalTickets(isNaN(batchSize) ? 100 : batchSize);
  }
}

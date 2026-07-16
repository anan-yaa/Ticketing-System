import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('✅ pgvector service connected directly to local PostgreSQL engine context.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting vector client bindings.');
  }

  /**
   * Upserts the high-dimensional array directly to our target Ticket row using raw string parsing.
   */
  async upsertDocumentVector(
    id: string,
    vector: number[],
    metadata: any,
    textPayload?: string,
  ): Promise<void> {
    try {
      if (!vector || !Array.isArray(vector) || vector.length === 0) {
        throw new Error(`Invalid dimensions array for element ID [${id}]`);
      }

      const postgresVectorString = `[${vector.join(',')}]`;

      // Update the vector array using raw positional injections to bypass client formatting hooks
      if (textPayload !== undefined && textPayload !== null) {
        await this.prisma.$executeRaw`
          UPDATE "Ticket" 
          SET "embedding" = ${postgresVectorString}::vector,
              "resolutionSummary" = ${textPayload}
          WHERE "id" = ${id}
        `;
      } else {
        await this.prisma.$executeRaw`
          UPDATE "Ticket" 
          SET "embedding" = ${postgresVectorString}::vector
          WHERE "id" = ${id}
        `;
      }

      this.logger.debug(`Successfully saved float dimensions to Ticket row [${id}].`);
    } catch (error) {
      this.logger.error(`Failed to stream array to pgvector column target [${id}]:`, error);
      throw error;
    }
  }

  /**
   * Searches historical records matching the vector using Cosine Distance metric logic (<=>).
   */
  async querySimilarDocuments(
    vector: number[],
    ticketType: string,
    limit: number,
  ): Promise<any[]> {
    try {
      if (!vector || !Array.isArray(vector) || vector.length === 0) {
        throw new Error('Query tracking input must be a populated array sequence.');
      }

      const postgresVectorString = `[${vector.join(',')}]`;
      const resultLimit = limit || 3;

      let records: any[] = [];
      
      // Perform matching based on classification types
      if (ticketType) {
        records = await this.prisma.$queryRaw`
          SELECT "id", "ticketSeq", "title", "description", "resolutionSummary", "ticketType", "category", "status",
                 (1 - ("embedding" <=> ${postgresVectorString}::vector)) as "score"
          FROM "Ticket"
          WHERE "embedding" IS NOT NULL 
            AND "ticketType" = ${ticketType}
          ORDER BY "embedding" <=> ${postgresVectorString}::vector ASC
          LIMIT ${resultLimit}
        `;
      } else {
        records = await this.prisma.$queryRaw`
          SELECT "id", "ticketSeq", "title", "description", "resolutionSummary", "ticketType", "category", "status",
                 (1 - ("embedding" <=> ${postgresVectorString}::vector)) as "score"
          FROM "Ticket"
          WHERE "embedding" IS NOT NULL
          ORDER BY "embedding" <=> ${postgresVectorString}::vector ASC
          LIMIT ${resultLimit}
        `;
      }

      return records.map(row => ({
        id: row.id,
        score: row.score || 0,
        textPayload: row.resolutionSummary,
        metadata: {
          ticketId: row.id,
          ticketSeq: row.ticketSeq,
          ticketType: row.ticketType,
          category: row.category,
          status: row.status,
          title: row.title
        }
      }));
    } catch (error) {
      this.logger.error('Raw query match search optimization execution encountered a database mapping error:', error);
      return [];
    }
  }
}

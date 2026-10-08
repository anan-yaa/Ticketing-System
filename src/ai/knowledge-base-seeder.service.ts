import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from './vector.service';
import { TicketStatus } from '@prisma/client';
import { embedText } from './gemini-embedding';

export interface IngestionResult {
  totalScanned: number;
  succeeded: number;
  failed: number;
  processedIds: string[];
  errors: Array<{ ticketId: string; error: string }>;
}

@Injectable()
export class KnowledgeBaseSeederService {
  private readonly logger = new Logger(KnowledgeBaseSeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorService: VectorService,
  ) {}

  /**
   * Batch processing pipeline to backfill historical tickets into the Vector Database.
   *
   * @param batchSize Optional maximum number of unindexed tickets to process per run (default: 100)
   */
  async seedHistoricalTickets(batchSize = 100): Promise<IngestionResult> {
    this.logger.log(`Starting Phase 1 historical context ingestion pipeline (batch size: ${batchSize})...`);

    // 1. SCAN FOR EXISTING ARCHIVED RESOLUTIONS
    // Query Prisma for closed/resolved or archived tickets where isIndexedToVectorDb === false
    const whereCondition: any = {
      isIndexedToVectorDb: false,
      OR: [
        { status: TicketStatus.CLOSED },
        { status: 'RESOLVED' },
        { masterStatus: { isArchived: true } },
      ],
    };

    const unindexedTickets = await this.prisma.ticket.findMany({
      where: whereCondition,
      take: batchSize,
      select: {
        id: true,
        ticketSeq: true,
        title: true,
        description: true,
        resolutionSummary: true,
        ticketType: true,
        category: true,
        status: true,
      } as any,
    });

    const result: IngestionResult = {
      totalScanned: unindexedTickets.length,
      succeeded: 0,
      failed: 0,
      processedIds: [],
      errors: [],
    };

    if (unindexedTickets.length === 0) {
      this.logger.log('No unindexed historical tickets found matching criteria. Ingestion complete.');
      return result;
    }

    this.logger.log(`Found ${unindexedTickets.length} unindexed historical ticket(s) to process.`);

    // 2. ITERATE AND GENERATE EMBEDDING STRINGS & 3. EXECUTE BULK COMPILATION TRANSITIONS
    for (const ticket of unindexedTickets) {
      try {
        const ticketRow: any = ticket;
        const ticketTypeStr = ticketRow.ticketType || 'GENERAL';
        const categoryStr = ticketRow.category || 'Uncategorized';
        const resolutionStr = ticketRow.resolutionSummary && ticketRow.resolutionSummary.trim();
        if (!resolutionStr) {
          throw new Error('Ticket has no resolutionSummary; nothing useful to index.');
        }

        // Same context format as TicketsService.handleRealTimeTicketIngestion
        const textPayload = `Title: ${ticketRow.title} | Category: ${categoryStr} | Description: ${ticketRow.description} | Resolution: ${resolutionStr}`;

        // Generate embedding vector array (throws on failure; ticket stays unindexed)
        const vector = await embedText(textPayload, 'RETRIEVAL_DOCUMENT');

        // Attach ticketType and category keys as searchable vector metadata
        const metadata = {
          ticketId: ticketRow.id,
          ticketSeq: ticketRow.ticketSeq,
          ticketType: ticketTypeStr,
          category: categoryStr,
          status: ticketRow.status,
          title: ticketRow.title,
        };

        // Store only the vector; resolutionSummary is left untouched
        await this.vectorService.upsertDocumentVector(
          ticketRow.id,
          vector,
          metadata,
        );

        // Once successfully ingested, update ticket row flag and execution timestamp
        await this.prisma.ticket.update({
          where: { id: ticketRow.id },
          data: {
            isIndexedToVectorDb: true,
            vectorIndexedAt: new Date(),
          } as any,
        });

        result.succeeded++;
        result.processedIds.push(ticketRow.id);
        this.logger.debug(`Successfully ingested and marked ticket [${ticketRow.ticketSeq} (${ticketRow.id})] as indexed.`);
      } catch (error: any) {
        result.failed++;
        const errorMessage = error?.message || 'Unknown ingestion error';
        const failId = (ticket as any)?.id || 'unknown';
        result.errors.push({ ticketId: failId, error: errorMessage });
        this.logger.error(`Failed to ingest ticket [${failId}] into vector DB: ${errorMessage}`);
      }
    }

    this.logger.log(
      `Ingestion run finished. Scanned: ${result.totalScanned}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`,
    );

    return result;
  }
}

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { embedText, EMBEDDING_MODEL } from './gemini-embedding';

/**
 * Backfill: re-embeds every resolved ticket with Gemini gemini-embedding-001.
 * Seeders write hash-based mock vectors, which are not comparable with the
 * Gemini query vectors used by CoPilotService. Run this after seeding so the
 * whole knowledge base lives in the same embedding space as the queries.
 */

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    const parsedUrl = new URL(dbUrl);
    if (parsedUrl.password) {
      parsedUrl.password = encodeURIComponent(decodeURIComponent(parsedUrl.password));
      dbUrl = parsedUrl.toString();
    }
  } catch (err) {
    console.error('Failed to parse and encode DATABASE_URL password:', err);
  }
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DELAY_MS = 150;

async function main() {
  const tickets: any[] = await prisma.ticket.findMany({
    where: { resolutionSummary: { not: null } } as any,
    select: { id: true, ticketSeq: true, title: true, description: true, category: true, resolutionSummary: true } as any,
  });

  const candidates = tickets.filter(t => t.resolutionSummary && t.resolutionSummary.trim().length > 0);
  console.log(`Re-embedding ${candidates.length} resolved tickets with Gemini ${EMBEDDING_MODEL}...`);

  let success = 0;
  let failed = 0;
  const now = new Date();

  for (const t of candidates) {
    // Same context format as TicketsService.handleRealTimeTicketIngestion
    const contextText = `Title: ${t.title} | Category: ${t.category} | Description: ${t.description} | Resolution: ${t.resolutionSummary.trim()}`;

    try {
      const vector = await embedText(contextText, 'RETRIEVAL_DOCUMENT');
      const postgresVectorString = `[${vector.join(',')}]`;
      await prisma.$executeRaw`
        UPDATE "Ticket"
        SET "embedding" = ${postgresVectorString}::vector,
            "isIndexedToVectorDb" = true,
            "vectorIndexedAt" = ${now}
        WHERE "id" = ${t.id}
      `;
      success++;
    } catch (err: any) {
      failed++;
      console.error(`  Failed ticket #${t.ticketSeq ?? t.id.slice(0, 8)}: ${err.message}`);
    }

    if ((success + failed) % 20 === 0) {
      console.log(`  Progress: ${success + failed}/${candidates.length}`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone. ${success} re-embedded, ${failed} failed.`);
  if (failed > 0) {
    console.log('Failed tickets keep their old vectors. Re-run this script to retry them.');
  }
}

main()
  .catch(e => {
    console.error('Re-embed failed:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  const misplacedRows = ['CLOUD', 'MI', 'DATABASE', 'HEEKLO', 'SDFSD'];
  console.log('🧹 Cleaning up MasterCategory misplaced rows...');
  
  const result = await prisma.masterCategory.deleteMany({
    where: {
      name: { in: misplacedRows }
    }
  });

  console.log(`✅ Cleanup complete. Deleted ${result.count} rows.`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    const parsedUrl = new URL(dbUrl);
    if (parsedUrl.password) {
      const decodedPassword = decodeURIComponent(parsedUrl.password);
      parsedUrl.password = encodeURIComponent(decodedPassword);
      dbUrl = parsedUrl.toString();
    }
  } catch (err) {
    console.error('Failed to parse and encode DATABASE_URL password:', err);
  }
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@company.internal' },
    update: {
      passwordHash: passwordHash,
      status: 'ACTIVE',
      systemRole: 'SUPER_ADMIN',
    },
    create: {
      email: 'admin@company.internal',
      passwordHash: passwordHash,
      name: 'System Admin',
      status: 'ACTIVE',
      systemRole: 'SUPER_ADMIN',
    }
  });

  console.log("Password reset successfully for admin@company.internal");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

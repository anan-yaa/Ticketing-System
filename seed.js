const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@ticketing.internal' },
    update: {},
    create: {
      email: 'superadmin@ticketing.internal',
      passwordHash,
      name: 'System Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log("seeded");
}
main().finally(() => prisma.$disconnect());

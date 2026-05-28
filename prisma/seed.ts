import { PrismaClient, SystemRole as Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

let dbUrl = process.env.DATABASE_URL;
try {
  if (dbUrl) {
    const parsedUrl = new URL(dbUrl);
    if (parsedUrl.password) {
      const decodedPassword = decodeURIComponent(parsedUrl.password);
      parsedUrl.password = encodeURIComponent(decodedPassword);
      dbUrl = parsedUrl.toString();
    }
  }
} catch (err) {
  console.error('Failed to parse DATABASE_URL in seed:', err);
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  // 1. Seed Permissions
  const permissions = [
    { key: 'USER_VIEW', label: 'View Users', module: 'User' },
    { key: 'USER_CREATE', label: 'Create Users', module: 'User' },
    { key: 'USER_UPDATE', label: 'Update Users', module: 'User' },
    { key: 'USER_DELETE', label: 'Delete Users', module: 'User' },
    { key: 'ROLE_VIEW', label: 'View Roles', module: 'Role' },
    { key: 'ROLE_CREATE', label: 'Create Roles', module: 'Role' },
    { key: 'ROLE_UPDATE', label: 'Update Roles', module: 'Role' },
    { key: 'ROLE_DELETE', label: 'Delete Roles', module: 'Role' },
    { key: 'ROLE_ASSIGN', label: 'Assign Roles', module: 'Role' },
    { key: 'AUDIT_VIEW', label: 'View Audit Logs', module: 'Audit' },
    { key: 'TICKET_CREATE', label: 'Create Tickets', module: 'Ticket' },
    { key: 'TICKET_VIEW', label: 'View Tickets', module: 'Ticket' },
    { key: 'TICKET_UPDATE', label: 'Update Tickets', module: 'Ticket' },
    { key: 'TICKET_CLOSE', label: 'Close Tickets', module: 'Ticket' },
    { key: 'SETTINGS_ACCESS', label: 'Access Settings', module: 'Settings' },
    { key: 'TICKET_CREATE_AS_ADMIN', label: 'Create Tickets as Admin', module: 'Ticket' },
    { key: 'TICKET_CORE_DATA_UPDATE', label: 'Update Core Ticket Data', module: 'Ticket' },
    { key: 'MASTER_DATA_UPDATE', label: 'Update Master Config Data', module: 'MasterConfig' }
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { label: perm.label, module: perm.module },
      create: { key: perm.key, label: perm.label, module: perm.module }
    });
  }
  console.log('Seeded permissions');

  // 2. Seed System Roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with full system control', isSystem: true },
    { name: 'ADMIN', description: 'Administrator with operational control', isSystem: true },
    { name: 'USER', description: 'External user accessing system features', isSystem: true },
    { name: 'L1_ENGINEER', description: 'Tier 1 Support Engineer', isSystem: true },
    { name: 'L2_ENGINEER', description: 'Tier 2 Analyst', isSystem: true },
    { name: 'L3_ENGINEER', description: 'Tier 3 Architect', isSystem: true }
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: { name: r.name, description: r.description, isSystem: r.isSystem }
    });
  }
  console.log('Seeded system roles');

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });

  if (!superAdminRole || !adminRole || !customerRole) {
    throw new Error('Roles seeding failed: roles not found');
  }

  // 3. Seed RolePermission Mappings
  const allPerms = await prisma.permission.findMany();
  const adminPermKeys = ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'AUDIT_VIEW', 'TICKET_VIEW', 'TICKET_UPDATE', 'TICKET_CREATE_AS_ADMIN', 'TICKET_CORE_DATA_UPDATE', 'MASTER_DATA_UPDATE'];
  const customerPermKeys = ['TICKET_CREATE', 'TICKET_VIEW', 'SETTINGS_ACCESS'];

  // Clean old mappings for these system roles
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: { in: [superAdminRole.id, adminRole.id, customerRole.id] }
    }
  });

  // Map SUPER_ADMIN to all permissions
  const superAdminMappings = allPerms.map(p => ({
    roleId: superAdminRole.id,
    permissionId: p.id
  }));
  await prisma.rolePermission.createMany({ data: superAdminMappings });

  // Map ADMIN
  const adminMappings = allPerms
    .filter(p => adminPermKeys.includes(p.key))
    .map(p => ({
      roleId: adminRole.id,
      permissionId: p.id
    }));
  await prisma.rolePermission.createMany({ data: adminMappings });

  // Map CUSTOMER
  const customerMappings = allPerms
    .filter(p => customerPermKeys.includes(p.key))
    .map(p => ({
      roleId: customerRole.id,
      permissionId: p.id
    }));
  await prisma.rolePermission.createMany({ data: customerMappings });

  // Map L1, L2, L3 Engineers
  const engineerPermKeys = ['TICKET_VIEW', 'TICKET_UPDATE', 'USER_VIEW', 'SETTINGS_ACCESS', 'AUDIT_VIEW'];
  const l1Role = await prisma.role.findUnique({ where: { name: 'L1_ENGINEER' } });
  const l2Role = await prisma.role.findUnique({ where: { name: 'L2_ENGINEER' } });
  const l3Role = await prisma.role.findUnique({ where: { name: 'L3_ENGINEER' } });

  const engineerRoles = [l1Role, l2Role, l3Role].filter(r => r !== null);
  for (const engRole of engineerRoles) {
    if (engRole) {
      await prisma.rolePermission.deleteMany({ where: { roleId: engRole.id } });
      const mappings = allPerms
        .filter(p => engineerPermKeys.includes(p.key))
        .map(p => ({
          roleId: engRole.id,
          permissionId: p.id
        }));
      await prisma.rolePermission.createMany({ data: mappings });
    }
  }

  console.log('Seeded role-permission mappings');
  // 4. Seed SuperAdmin User Linked to Role
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {
      roleId: superAdminRole.id,
    },
    create: {
      email: 'superadmin@example.com',
      passwordHash,
      name: 'System Admin',
      systemRole: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      roleId: superAdminRole.id,
    },
  });

  console.log({ superAdmin });

  const secureHash = await bcrypt.hash('Password123', 10);

  if (l1Role) {
    await prisma.user.upsert({
      where: { email: 'l1@engineer.com' },
      update: { accessTier: 'L1_SUPPORT', roleId: l1Role.id, systemRole: Role.L1_ENGINEER, passwordHash: secureHash },
      create: { email: 'l1@engineer.com', name: 'L1 Engineer', passwordHash: secureHash, accessTier: 'L1_SUPPORT', systemRole: Role.L1_ENGINEER, status: UserStatus.ACTIVE, roleId: l1Role.id }
    });
    console.log('Seeded test user L1 Engineer (L1_SUPPORT)');
  }

  if (l2Role) {
    await prisma.user.upsert({
      where: { email: 'l2@engineer.com' },
      update: { accessTier: 'L2_ANALYST', roleId: l2Role.id, systemRole: Role.L2_ENGINEER, passwordHash: secureHash },
      create: { email: 'l2@engineer.com', name: 'L2 Engineer', passwordHash: secureHash, accessTier: 'L2_ANALYST', systemRole: Role.L2_ENGINEER, status: UserStatus.ACTIVE, roleId: l2Role.id }
    });
    console.log('Seeded test user L2 Engineer (L2_ANALYST)');
  }

  if (l3Role) {
    await prisma.user.upsert({
      where: { email: 'l3@engineer.com' },
      update: { accessTier: 'L3_ARCHITECT', roleId: l3Role.id, systemRole: Role.L3_ENGINEER, passwordHash: secureHash },
      create: { email: 'l3@engineer.com', name: 'L3 Engineer', passwordHash: secureHash, accessTier: 'L3_ARCHITECT', systemRole: Role.L3_ENGINEER, status: UserStatus.ACTIVE, roleId: l3Role.id }
    });
    console.log('Seeded test user L3 Engineer (L3_ARCHITECT)');
  }
  // Link any users without a roleId to their corresponding system role record
  const users = await prisma.user.findMany({ where: { roleId: null } });
  for (const u of users) {
    const roleRecord = await prisma.role.findUnique({ where: { name: u.systemRole } });
    if (roleRecord) {
      await prisma.user.update({
        where: { id: u.id },
        data: { roleId: roleRecord.id }
      });
      console.log(`Linked user ${u.email} to role ${roleRecord.name}`);
    }
  }

  // 5. Seed Master Data Tables
  const defaultTypes = [
    { name: 'Incident', description: 'System interruption or threat issue' },
    { name: 'Service Request', description: 'General access or configuration change request' },
    { name: 'Proactive Notification', description: 'Automated monitoring threat trigger alert' },
    { name: 'Report', description: 'Scheduled audit analysis report' },
    { name: 'Information', description: 'General technical query informational request' },
    { name: 'Notification (Domain/Renewal)', description: 'Identity domain or renewal task' },
    { name: 'Junk (Advertisement)', description: 'Filtered spam or advertising message' }
  ];

  const defaultCategories = [
    { name: "Core Servers", description: "High-value data storage and active directory units" },
    { name: "Corporate Network", description: "Internal office endpoints and local Wi-Fi nodes" },
    { name: "Network Infrastructure", description: "Firewalls, switches, and router nodes" },
    { name: "Remote", description: "Off-site workstations connecting externally" }
  ];

  for (const t of defaultTypes) {
    await prisma.masterType.upsert({
      where: { name: t.name },
      update: { description: t.description },
      create: { name: t.name, description: t.description }
    });
  }
  console.log('Seeded master types');

  await prisma.masterCategory.deleteMany();
  for (const c of defaultCategories) {
    await prisma.masterCategory.upsert({
      where: { name: c.name },
      update: { description: c.description },
      create: { name: c.name, description: c.description }
    });
  }
  console.log('Seeded master categories');

  await prisma.masterAssignmentGroup.deleteMany();
  await prisma.serviceContract.deleteMany();

  const servicesData = [
    { name: 'RIMS', description: 'Remote Infrastructure Management Services' },
    { name: 'MSS', description: 'Managed Security Services' },
    { name: 'WPE', description: 'Workplace Endpoints' },
    { name: 'MAINTENANCE', description: 'MAINTENANCE - SYSTEM INFRASTRUCTURE & DISPATCH' },
  ];

  const servicesMap: { [key: string]: string } = {};

  for (const s of servicesData) {
    const service = await prisma.serviceContract.create({
      data: { name: s.name, isActive: true },
    });
    servicesMap[s.name] = service.id;
  }
  console.log('Seeded Service Contracts');

  const defaultQueues = [

    // RIMS
    { name: 'RIMS - Information', description: 'RIMS Information routing sub-queue', serviceId: servicesMap['RIMS'] },
    { name: 'RIMS - Offboarding', description: 'RIMS Offboarding routing sub-queue', serviceId: servicesMap['RIMS'] },
    { name: 'RIMS - Proactive', description: 'RIMS Proactive routing sub-queue', serviceId: servicesMap['RIMS'] },

    // MSS
    { name: 'MSS - SIEM Alerts', description: 'MSS SIEM Alerts monitoring sub-queue', serviceId: servicesMap['MSS'] },
    { name: 'MSS - Incident Response', description: 'MSS Incident Response active handling sub-queue', serviceId: servicesMap['MSS'] },
    { name: 'MSS - Vulnerability Management', description: 'MSS Vulnerability Management scan and patch sub-queue', serviceId: servicesMap['MSS'] },

    // WPE
    { name: 'WPE - Device Enrollment', description: 'WPE MDM Device Enrollment and onboarding sub-queue', serviceId: servicesMap['WPE'] },
    { name: 'WPE - Quarantine Investigation', description: 'WPE Host isolation and quarantine investigation sub-queue', serviceId: servicesMap['WPE'] },
    { name: 'WPE - Software Distribution', description: 'WPE Managed Software deployment and distribution sub-queue', serviceId: servicesMap['WPE'] }
  ];

  for (const q of defaultQueues) {
    await prisma.masterAssignmentGroup.create({
      data: { name: q.name, description: q.description, serviceId: q.serviceId }
    });
  }
  console.log('Seeded master assignment groups');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

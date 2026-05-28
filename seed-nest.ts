import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SystemRole as Role, UserStatus } from '@prisma/client';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
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
    { key: 'MASTER_DATA_UPDATE', label: 'Manage Master Data', module: 'Settings' }
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
    { name: 'USER', description: 'External user accessing system features', isSystem: true }
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
  const adminPermKeys = ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'AUDIT_VIEW', 'TICKET_VIEW', 'TICKET_UPDATE'];
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
  console.log('Seeded role-permission mappings');

  // 4. Seed SuperAdmin User Linked to Role
  await prisma.user.upsert({
    where: { email: 'superadmin@ticketing.internal' },
    update: {
      roleId: superAdminRole.id,
      mustChangePassword: false,
    },
    create: {
      email: 'superadmin@ticketing.internal',
      passwordHash,
      name: 'System Admin',
      systemRole: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      roleId: superAdminRole.id,
      mustChangePassword: false,
    },
  });

  console.log('Seeded SUPER_ADMIN user linked to SUPER_ADMIN role');

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

  // 5. Seed Master Data (EPO Categories)
  await prisma.masterCategory.deleteMany();
  const epoCategories = [
    { name: "Core Servers", description: "High-value data storage and active directory units", isActive: true },
    { name: "Corporate Network", description: "Internal office endpoints and local Wi-Fi nodes", isActive: true },
    { name: "Network Infrastructure", description: "Firewalls, switches, and router nodes", isActive: true },
    { name: "Remote", description: "Off-site workstations connecting externally", isActive: true }
  ];

  for (const cat of epoCategories) {
    await prisma.masterCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: cat.isActive },
      create: { name: cat.name, description: cat.description, isActive: cat.isActive }
    });
  }
  console.log('Seeded Master Data (EPO Categories)');

  // 6. Seed Master Data (Assignment Groups and ServiceContracts)
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
  console.log('Seeded Master Data (Assignment Groups)');

  await app.close();
}
bootstrap();

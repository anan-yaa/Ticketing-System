import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConfigDto } from './dto/create-config.dto';

@Injectable()
export class MasterConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // Master Categories
  async getCategories(activeOnly?: boolean) {
    return this.prisma.masterCategory.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateConfigDto) {
    const existing = await this.prisma.masterCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Category with name "${dto.name}" already exists`);
    }
    console.log("⚙️ [PRISMA CALL] Sending mutation payload to MasterCategory table...");
    try {
      return await this.prisma.masterCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
    } catch (dbError) {
      console.error("🚨 [PRISMA CRASH] Database constraint blocked insertion:", dbError);
      throw dbError;
    }
  }

  async toggleCategory(id: string) {
    const record = await this.prisma.masterCategory.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return this.prisma.masterCategory.update({
      where: { id },
      data: { isActive: !record.isActive },
    });
  }

  // Master Types
  async getTypes(activeOnly?: boolean) {
    return this.prisma.masterType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createType(dto: CreateConfigDto) {
    const existing = await this.prisma.masterType.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Type with name "${dto.name}" already exists`);
    }
    return this.prisma.masterType.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async toggleType(id: string) {
    const record = await this.prisma.masterType.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Type with ID "${id}" not found`);
    }
    return this.prisma.masterType.update({
      where: { id },
      data: { isActive: !record.isActive },
    });
  }

  // Master Queues
  async getQueues(activeOnly?: boolean) {
    return this.prisma.masterAssignmentGroup.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { service: true },
      orderBy: { name: 'asc' },
    });
  }

  async createQueue(dto: CreateConfigDto) {
    const existing = await this.prisma.masterAssignmentGroup.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Queue with name "${dto.name}" already exists`);
    }
    return this.prisma.masterAssignmentGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async toggleQueue(id: string) {
    const record = await this.prisma.masterAssignmentGroup.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Queue with ID "${id}" not found`);
    }
    return this.prisma.masterAssignmentGroup.update({
      where: { id },
      data: { isActive: !record.isActive },
    });
  }

  async getServices(activeOnly?: boolean) {
    return this.prisma.serviceContract.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createService(dto: CreateConfigDto) {
    const existing = await this.prisma.serviceContract.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Service Group with name "${dto.name}" already exists`);
    }
    return this.prisma.serviceContract.create({
      data: {
        name: dto.name,
      },
    });
  }

  async toggleService(id: string) {
    const record = await this.prisma.serviceContract.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Service Group with ID "${id}" not found`);
    }
    return this.prisma.serviceContract.update({
      where: { id },
      data: { isActive: !record.isActive },
    });
  }

  async getSlaRules() {
    return this.prisma.slaRule.findMany({
      include: { tiers: true },
      orderBy: { ticketType: 'asc' },
    });
  }

  async createSlaRule(dto: { ticketType: string; tiers: any[] }) {
    return await this.prisma.slaRule.upsert({
      where: { ticketType: dto.ticketType },
      update: {
        tiers: {
          deleteMany: {}, // Clear previous rules to prevent indexing duplicates
          create: dto.tiers.map(t => ({
            level: t.tierName,
            name: t.tierName,
            description: t.scopeDescription || '',
            respH: 0,
            respM: Number(t.responseTimeMin) || 0,
            resH: Number(t.resolutionTimeHr) || 0,
            resM: 0,
            isActive: t.isActive !== undefined ? t.isActive : true,
          }))
        }
      },
      create: {
        ticketType: dto.ticketType,
        tiers: {
          create: dto.tiers.map(t => ({
            level: t.tierName,
            name: t.tierName,
            description: t.scopeDescription || '',
            respH: 0,
            respM: Number(t.responseTimeMin) || 0,
            resH: Number(t.resolutionTimeHr) || 0,
            resM: 0,
            isActive: t.isActive !== undefined ? t.isActive : true,
          }))
        }
      }
    });
  }

  async toggleSlaRuleStatus(id: string) {
    const current = await this.prisma.slaRule.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException(`SLA Rule with ID "${id}" not found`);
    }
    return this.prisma.slaRule.update({
      where: { id },
      data: { isActive: !current.isActive },
    });
  }
}

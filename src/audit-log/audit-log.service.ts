import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateLogDto {
  action: string;
  performedById: string;
  details: any;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog({ action, performedById, details }: CreateLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          action,
          performedById,
          details,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async getLogs(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

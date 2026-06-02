import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledTasksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // 🔗 THE FIX: Explicitly include masterCategory properties so the UI can render category names
    return this.prisma.scheduledTask.findMany({
      include: {
        masterCategory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(data: any) {
    return this.prisma.scheduledTask.create({
      data: {
        title: data.title,
        subject: data.subject,
        instructions: data.instructions,
        dayOfMonth: Number(data.dayOfMonth),
        hour: Number(data.hour),
        minute: Number(data.minute),
        isActive: data.isActive ?? true,

        // 🔗 THE CRITICAL FIX: Explicitly connect the mandatory foreign key relation
        masterCategory: {
          connect: { id: data.masterCategoryId }
        }
      }
    });
  }

  async remove(id: string) {
    return this.prisma.scheduledTask.delete({
      where: { id }
    });
  }

  async update(id: string, data: any) {
    return this.prisma.scheduledTask.update({
      where: { id },
      data: {
        isActive: data.isActive
      }
    });
  }
}

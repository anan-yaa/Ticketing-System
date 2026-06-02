import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledTasksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.scheduledTask.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: any) {
    return this.prisma.scheduledTask.create({
      data: {
        title: data.title,
        subject: data.subject,
        instructions: data.instructions,
        dayOfMonth: parseInt(data.dayOfMonth, 10),
        hour: parseInt(data.hour, 10),
        minute: parseInt(data.minute, 10),
        isActive: data.isActive !== undefined ? data.isActive : true,
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

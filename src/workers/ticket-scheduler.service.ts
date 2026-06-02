import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketSchedulerService {
  private readonly logger = new Logger(TicketSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('* * * * *')
  async handleRecurringTickets() {
    const now = new Date();
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    try {
      // 🔍 THE FIX: Clean query filtering without the old dead text category column
      const matchingTasks = await this.prisma.scheduledTask.findMany({
        where: {
          dayOfMonth: currentDay,
          hour: currentHour,
          minute: currentMinute,
          isActive: true,
        },
        include: {
          masterCategory: true // 👈 Dynamic load of the real linked table entity properties
        }
      });

      if (matchingTasks.length === 0) return;

      this.logger.log(`🎯 Found ${matchingTasks.length} recurring blueprints to run.`);

      for (const task of matchingTasks) {
        const fallbackUser = await this.prisma.user.findFirst({
          where: { systemRole: 'SUPER_ADMIN' }
        });

        if (!fallbackUser) {
          this.logger.error('❌ Skipping execution: No SUPER_ADMIN found to link relation.');
          continue;
        }

        await this.prisma.ticket.create({
          data: {
            title: task.title,
            description: task.instructions,
            status: 'OPEN',
            priority: 'MEDIUM',
            source: 'SYSTEM',
            createdAt: now,
            
            // 🔗 Pull categorization cleanly directly from the linked master record name 
            category: task.masterCategory?.name || 'GENERAL',

            // Restore mandatory SLA telemetry fields 
            slaDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000), 
            ttfrDeadline: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            resolutionDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000),
            responseTargetMinutes: 240,
            resolutionTargetMinutes: 2880,

            customer: {
              connect: { id: fallbackUser.id }
            }
          },
        });

        this.logger.log(`✅ Automated Ticket Instantiated: "${task.title}" under Category [${task.masterCategory?.name}]`);
      }
    } catch (error) {
      this.logger.error('❌ AUTOMATION WORKER EXCEPTION:', error.stack || error.message);
    }
  }

  @Cron('* * * * *')
  async restoreSnoozedTickets() {
    try {
      const now = new Date();
      
      const expiredTickets = await this.prisma.ticket.findMany({
        where: {
          status: 'TEMPORARILY_CLOSED',
          snoozedUntil: {
            lte: now
          },
          NOT: {
            snoozedUntil: null
          }
        }
      });

      if (expiredTickets.length === 0) return;

      this.logger.log(`⏳ Found ${expiredTickets.length} snoozed tickets ready to wake up.`);

      for (const ticket of expiredTickets) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: (ticket.preSnoozeStatus as any) || 'OPEN',
            snoozedUntil: null,
            snoozedAt: null,
            preSnoozeStatus: null,
          }
        });

        this.logger.log(`⏰ Woke up Ticket #${ticket.ticketSeq} (ID: ${ticket.id}). Restored to active queues.`);
      }
    } catch (error) {
      this.logger.error('❌ SNOOZE RESTORATION WORKER EXCEPTION:', error.stack || error.message);
    }
  }
}

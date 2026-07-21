import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketSchedulerService {
  private readonly logger = new Logger(TicketSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  // Run a background cron job engine every hour on the hour to inspect rules
  @Cron('0 * * * *')
  async handleCron() {
    const now = new Date();
    const currentDay = now.getDate();
    const currentHour = now.getHours();

    this.logger.log(`🤖 CRON ENGINE LOG: Scanning scheduled ticket blueprints for Day ${currentDay}, Hour ${currentHour}...`);

    try {
      // Look for matching active configuration rules
      const matchingTasks = await this.prisma.scheduledTask.findMany({
        where: {
          dayOfMonth: currentDay,
          hour: currentHour,
          isActive: true,
        },
      });

      for (const task of matchingTasks) {
        // Parse any dynamic formatting rules
        const finalizedSubject = task.subject;

        // 1. First, search for a default system account or use an existing fallback account id
        let targetUserId = "";
        const fallbackUser = await this.prisma.user.findFirst({
          where: { systemRole: 'ADMIN' } // or 'USER' - matching whatever role flag your User table uses
        });
        
        if (fallbackUser) {
          targetUserId = fallbackUser.id;
        }

        // Fetch SLA rule if applicable
        const slaMatrix = await this.prisma.slaMatrix.findFirst({
          where: { priorityTier: 'NORMAL', isActive: true }
        });
        
        let responseTarget = 60;
        let resolutionTarget = 1440;
        if (slaMatrix) {
          responseTarget = slaMatrix.responseTime;
          resolutionTarget = slaMatrix.resolutionTime;
        }

        const slaDeadline = new Date(now.getTime() + resolutionTarget * 60 * 1000);
        const ttfrDeadline = new Date(now.getTime() + responseTarget * 60 * 1000);

        // Instantiate a new ticket row directly inside the incoming system queue
        await this.prisma.ticket.create({
          data: {
            title: finalizedSubject,
            description: task.instructions,
            status: 'OPEN', // Falls into active incoming open tracking queues
            priority: 'MEDIUM', // Maps to TicketPriority
            category: finalizedSubject.toLowerCase().includes('maintenance') ? 'MAINTENANCE' : 'GENERAL',
            source: 'SYSTEM',
            createdAt: now,
            
            // SLA tracking fields required by schema
            slaDeadline: slaDeadline,
            ttfrDeadline: ttfrDeadline,
            resolutionDeadline: slaDeadline,
            responseTargetMinutes: responseTarget,
            resolutionTargetMinutes: resolutionTarget,
            
            // Connects the mandatory customer relation model using a verified ID
            customer: {
              connect: { id: targetUserId }
            }
          },
        });

        this.logger.log(`AUTOMATION SUCCESS: Instantiated scheduled ticket "${finalizedSubject}" directly inside incoming queue.`);
      }
    } catch (error) {
      this.logger.error('CRON WORKER PROCESSING FAULT:', error);
    }
  }
}

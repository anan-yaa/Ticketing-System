import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketSchedulerService {
  private readonly logger = new Logger(TicketSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('* * * * *') // 👈 Wakes up every minute to check for exact recurring times
  async handleRecurringTickets() {
    const now = new Date();
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes(); // 👈 Extract exact minute

    try {
      // Query tasks matching the day of the month, hour, and the precise minute
      const matchingTasks = await this.prisma.scheduledTask.findMany({
        where: {
          dayOfMonth: currentDay,
          hour: currentHour,
          minute: currentMinute, // 👈 Ensures minutes like :17 are not skipped
          isActive: true,
        },
      });

      if (matchingTasks.length === 0) return;

      this.logger.log(`🎯 Found ${matchingTasks.length} recurring blueprints to run at ${currentHour}:${currentMinute}`);

      for (const task of matchingTasks) {
        // 🔍 TARGET SUPER_ADMIN FOR SYSTEM AUTOMATIONS USING EXACT PRISMA ENUMS
        let fallbackUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              { systemRole: 'SUPER_ADMIN' },
              { role: { name: 'SUPER_ADMIN' } } // Fallback relation if roles are in a joined table
            ]
          }
        });

        // 1st Fallback: If no explicit SUPER_ADMIN is caught, look for type-safe uppercase ADMIN
        if (!fallbackUser) {
          fallbackUser = await this.prisma.user.findFirst({
            where: {
              systemRole: 'ADMIN'
            }
          });
        }

        // 2nd Fallback: Grab the absolute first record available in the User table so it never fails
        if (!fallbackUser) {
          fallbackUser = await this.prisma.user.findFirst();
        }

        // Emergency safety boundary if the database user environment is completely empty
        if (!fallbackUser) {
          this.logger.error('❌ CRITICAL: Automation skipped. The database User table is entirely empty.');
          continue;
        }

        this.logger.log(`🔗 Binding automation ticket to User ID: ${fallbackUser.id} [${fallbackUser.systemRole || 'SYSTEM'}]`);

        // Create a recurring copy inside the main open tracking queues
        await this.prisma.ticket.create({
          data: {
            title: task.title,
            description: task.instructions,
            status: 'OPEN',
            priority: 'MEDIUM',
            category: 'MAINTENANCE',
            source: 'SYSTEM',
            createdAt: now,
            
            // SLA telemetry - required by strict schema constraints
            slaDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000), 
            ttfrDeadline: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            resolutionDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000),
            responseTargetMinutes: 240,
            resolutionTargetMinutes: 2880,

            // Connect the mandatory user relation
            customer: {
              connect: { id: fallbackUser.id }
            }
          },
        });

        this.logger.log(`✅ Recurring ticket spawned into dashboard queue: "${task.title}"`);
      }
    } catch (error) {
      this.logger.error('❌ AUTOMATION WORKER EXCEPTION:', error.stack || error.message);
    }
  }
}

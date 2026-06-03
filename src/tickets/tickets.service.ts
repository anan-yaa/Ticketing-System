import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketPriority, TicketStatus, SubStatus, CommentType } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateCoreDataDto } from './dto/update-core-data.dto';
import { SlaService } from './sla.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
  ) { }

  private async findTicketById(idOrSeq: string) {
    const include = {
      comments: {
        orderBy: { createdAt: 'asc' as const },
        include: { author: { select: { id: true, name: true, email: true, role: { select: { name: true } } } } }
      },
      customer: { select: { name: true, email: true } },
      attachments: true,
      masterStatus: true,
    };

    // Handle 'T007' format — strip prefix and look up by ticketSeq
    if (/^T\d+$/i.test(idOrSeq)) {
      const seq = parseInt(idOrSeq.replace(/^T/i, ''), 10);
      console.log('[findTicketById] T-format lookup — ticketSeq:', seq);
      return this.prisma.ticket.findUnique({ where: { ticketSeq: seq }, include });
    }
    // Handle plain numeric string like '7'
    const asNum = parseInt(idOrSeq, 10);
    if (!isNaN(asNum) && String(asNum) === idOrSeq) {
      console.log('[findTicketById] Numeric string lookup — ticketSeq:', asNum);
      return this.prisma.ticket.findUnique({ where: { ticketSeq: asNum }, include });
    }
    // Fall back to UUID lookup
    console.log('[findTicketById] UUID lookup — id:', idOrSeq);
    return this.prisma.ticket.findUnique({ where: { id: idOrSeq }, include });
  }

  private formatTicket(ticket: any) {
    if (!ticket) return null;
    const formattedId = `T${String(ticket.ticketSeq || 1).padStart(3, '0')}`;
    return {
      ...ticket,
      id: formattedId,
      originalId: ticket.id,
    };
  }

  async createTicket(user: any, data: CreateTicketDto) {
    const { title, description, priority = TicketPriority.LOW, category, source = 'PORTAL', ticketSource, status, isRecurring, cronExpression, executeAt } = data;

    let targetCustomerId = user.userId || user.id;
    const hasAdminCreate = user.permissions && user.permissions.includes('TICKET_CREATE_AS_ADMIN');

    if (hasAdminCreate && data.customerId) {
      targetCustomerId = data.customerId;
    }

    const autoCategory = category || 'General Support';

    // Step A & B: Query the database configuration table for the active SLA matrix settings
    const activeConfig = await this.prisma.slaMatrix.findUnique({
      where: { priorityTier: String(priority) }
    });

    // Fallback defaults if configuration is missing
    let responseTime = 4 * 60; // default P4 (240 mins)
    let resolutionTime = 48 * 60; // default P4 (2880 mins)

    if (activeConfig && activeConfig.isActive) {
      responseTime = activeConfig.responseTime;
      resolutionTime = activeConfig.resolutionTime;
    } else {
      const priorityStr = String(priority);
      if (priorityStr === 'P1' || priority === TicketPriority.URGENT) {
        responseTime = 2 * 60;
        resolutionTime = 4 * 60;
      } else if (priorityStr === 'P2' || priority === TicketPriority.HIGH) {
        responseTime = 2 * 60;
        resolutionTime = 6 * 60;
      } else if (priorityStr === 'P3' || priority === TicketPriority.MEDIUM) {
        responseTime = 4 * 60;
        resolutionTime = 12 * 60;
      }
    }

    // Step D: Calculate our fixed deadline timestamp based strictly on these static snapshot fields
    const now = new Date();
    const ttfrDeadline = new Date(now.getTime() + responseTime * 60 * 1000);
    const resolutionDeadline = new Date(now.getTime() + resolutionTime * 60 * 1000);

    // Using resolutionDeadline as the main slaDeadline for legacy fields
    const slaDeadline = resolutionDeadline;

    // Step C: Assign those extracted integers directly to our new ticket columns
    const ticket = await this.prisma.ticket.create({
      data: {
        title,
        description,
        priority,
        category: autoCategory,
        source: ticketSource || source,
        ticketSource: ticketSource || null,
        status: status === 'SCHEDULED' ? TicketStatus.SCHEDULED : TicketStatus.OPEN,
        isRecurring: isRecurring || false,
        cronExpression: cronExpression || null,
        executeAt: executeAt ? new Date(executeAt) : null,
        slaDeadline,
        ttfrDeadline,
        resolutionDeadline,
        responseTargetMinutes: responseTime,
        resolutionTargetMinutes: resolutionTime,
        customerId: targetCustomerId,
      },
    });

    return this.formatTicket(ticket);
  }

  // GET /tickets/my-tickets (Customer only)
  async getCustomerTickets(customerId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        comments: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    return tickets.map(t => this.formatTicket(t));
  }

  // POST /tickets/:id/messages
  async addMessage(ticketId: string, user: any, content: string, isInternal: boolean) {
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    const authorId = user.userId || user.id;
    const role = user.role;

    let type: CommentType = CommentType.CLIENT_REPLY;

    if (role !== 'CUSTOMER' && role !== 'User') { // Basic check for staff vs customer
      if (isInternal) {
        type = CommentType.INTERNAL_NOTE;
      } else {
        type = CommentType.AGENT_REPLY;
      }
    } else {
      type = CommentType.CLIENT_REPLY;
      isInternal = false;
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        ticketId: ticket.id,
        authorId,
        type,
        isInternal,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return comment;
  }

  // PATCH /tickets/:id (Admin/Customer)
  async updateTicket(ticketId: string, data: any) {
    const { title, description, priority, category, status } = data;
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        title,
        description,
        priority,
        category,
        status,
      },
    });
    return this.formatTicket(updated);
  }

  // PATCH /tickets/:id/close (Customer)
  async closeTicket(ticketId: string, customerId: string) {
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (ticket.customerId !== customerId) {
      throw new ForbiddenException('You can only close your own tickets.');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.CLOSED },
    });

    return this.formatTicket(updatedTicket);
  }

  // PATCH /tickets/:id/temporary-closure (Admin)
  async processTemporaryClosure(ticketId: string, snoozedUntilStr: string) {
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    try {
      const updatedTicket = await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          preSnoozeStatus: ticket.status,
          status: TicketStatus.TEMPORARILY_CLOSED,
          snoozedAt: new Date(),
          snoozedUntil: new Date(snoozedUntilStr),
        },
      });
      return this.formatTicket(updatedTicket);
    } catch (error) {
      console.error('[processTemporaryClosure] Failed to snooze ticket:', error);
      throw new BadRequestException('Failed to process temporary closure.');
    }
  }

  // GET /tickets/admin/all (Admin/SuperAdmin)
  async getAllTickets() {
    const tickets = await this.prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true } },
        attachments: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: {
                  select: { name: true }
                }
              }
            }
          }
        },
      }
    });
    return tickets.map(t => this.formatTicket(t));
  }

  // DELETE /tickets/:id (Admin only)
  async deleteTicket(ticketId: string) {
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.prisma.ticket.delete({
      where: { id: ticket.id },
    });

    return { message: 'Ticket successfully deleted.' };
  }

  async updateCoreData(ticketId: string, data: any) {
    console.log('[updateCoreData] resolving ticketId:', ticketId);
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) {
      console.error('[updateCoreData] Ticket NOT found for id:', ticketId);
      throw new NotFoundException(`Ticket not found for id: ${ticketId}`);
    }
    console.log('[updateCoreData] Found ticket UUID:', ticket.id, '| seq:', ticket.ticketSeq);

    const isPriorityAltered = data.priority !== undefined && data.priority !== ticket.priority;
    const isCriticalityAltered = data.criticality !== undefined && data.criticality !== ticket.criticality;
    const isContractAltered = data.serviceContract !== undefined && data.serviceContract !== ticket.serviceContract;

    let slaDeadline = ticket.slaDeadline;
    if (isPriorityAltered || isCriticalityAltered || isContractAltered) {
      const activePriority = data.priority !== undefined ? data.priority : ticket.priority;
      const activeCriticality = data.criticality !== undefined ? data.criticality : ticket.criticality;
      const activeContract = data.serviceContract !== undefined ? data.serviceContract : ticket.serviceContract;

      slaDeadline = this.slaService.calculateSlaDeadline(
        activePriority,
        activeCriticality,
        activeContract,
        ticket.createdAt,
      );
    }

    let ttfrDeadline = ticket.ttfrDeadline;
    let resolutionDeadline = ticket.resolutionDeadline;

    if (isPriorityAltered) {
      const activePriority = data.priority !== undefined ? data.priority : ticket.priority;
      const priorityStr = String(activePriority);
      let ttfrHours = 4;
      let resolutionHours = 48;

      if (priorityStr === 'P1' || activePriority === TicketPriority.URGENT) {
        ttfrHours = 2;
        resolutionHours = 4;
      } else if (priorityStr === 'P2' || activePriority === TicketPriority.HIGH) {
        ttfrHours = 2;
        resolutionHours = 6;
      } else if (priorityStr === 'P3' || activePriority === TicketPriority.MEDIUM) {
        ttfrHours = 4;
        resolutionHours = 12;
      } else if (priorityStr === 'P4' || activePriority === TicketPriority.LOW) {
        ttfrHours = 4;
        resolutionHours = 48;
      }

      ttfrDeadline = new Date(new Date(ticket.createdAt).getTime() + ttfrHours * 60 * 60 * 1000);
      resolutionDeadline = new Date(new Date(ticket.createdAt).getTime() + resolutionHours * 60 * 60 * 1000);
      console.log(`[updateCoreData] Priority altered to ${activePriority}. TTFR hours: ${ttfrHours}, Resolution hours: ${resolutionHours}`);
    }

    // Strip non-Prisma fields before writing to the database
    const { timeSpentTracking, ticketId: _tid, scheduledAt, isArchived, archivedAt, closedBy, slaTimerActive, ...prismaData } = data as any;
    const timeSpentMin = timeSpentTracking !== undefined ? timeSpentTracking : data.timeSpentMin;

    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    
    // Process Automation Flags
    const isResolved = prismaData.status === 'RESOLVED';
    const finalIsArchived = isArchived !== undefined ? isArchived : isResolved;
    const finalArchivedAt = archivedAt !== undefined ? new Date(archivedAt) : (isResolved ? new Date() : null);
    const finalSlaTimerActive = isResolved ? false : (slaTimerActive !== undefined ? slaTimerActive : true);

    try {
      const updated = await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          ...prismaData,
          isArchived: finalIsArchived,
          archivedAt: finalArchivedAt,
          closedBy,
          slaTimerActive: finalSlaTimerActive,
          ...(timeSpentMin !== undefined ? { timeSpentMin } : {}),
          ...(scheduledAt !== undefined ? { scheduledAt: parsedScheduledAt } : {}),
          slaDeadline,
          ttfrDeadline,
          resolutionDeadline,
        },
      });
      console.log('[updateCoreData] Update SUCCESS — seq:', ticket.ticketSeq);
      return this.formatTicket(updated);
    } catch (err) {
      console.error('[updateCoreData] Prisma update FAILED:', err.message);
      throw err;
    }
  }

  async updateStatus(ticketId: string, status?: string, subStatus?: string) {
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updateData: any = {};
    let masterStatus = null;
    
    // Determine which status to query: the new one being passed in, or the existing one
    const statusIdentifier = status || ticket.statusId || ticket.status;

    if (statusIdentifier) {
      // 1. LOOK UP STATUS BEHAVIORS
      masterStatus = await this.prisma.masterStatus.findFirst({
        where: {
          OR: [
            { id: statusIdentifier },
            { name: statusIdentifier }
          ]
        }
      });
    }

    if (status) {
      if (masterStatus) {
        // 3. ADAPTIVE LOGIC FOR NEW CUSTOM STATUSES
        updateData.statusId = masterStatus.id;
        updateData.status = masterStatus.name as TicketStatus;
      } else {
        updateData.status = status as TicketStatus;
      }
      
      // If status is OPEN or CLOSED, clear subStatus for legacy compatibility
      if (updateData.status === 'OPEN' || updateData.status === 'CLOSED') {
        updateData.subStatus = SubStatus.NONE;
      }
    }

    // Process subStatus if provided
    if (subStatus) {
      updateData.subStatus = subStatus as SubStatus;
      if (subStatus !== 'NONE' && !status) {
        updateData.status = TicketStatus.IN_PROGRESS;
      }
    }

    const finalStatus = updateData.status || ticket.status;
    const finalSubStatus = updateData.subStatus !== undefined ? updateData.subStatus : ticket.subStatus;
    
    if (masterStatus) {
      // 2. EXECUTE ARCHIVAL OR PAUSE LOGIC
      
      if (masterStatus.isArchived) {
        updateData.isArchived = true;
        updateData.archivedAt = new Date();
        updateData.resolvedAt = new Date();
        updateData.slaTimerActive = false;
      } else {
        updateData.slaTimerActive = true;
        updateData.isArchived = false;
        updateData.archivedAt = null;
        updateData.resolvedAt = null;
      }

      if (masterStatus.isSlaPaused && !ticket.slaPausedAt) {
        updateData.slaPausedAt = new Date();
        updateData.lastPausedAt = new Date(); // Legacy compatibility
      } else if (!masterStatus.isSlaPaused && ticket.slaPausedAt) {
        const now = new Date();
        const pausedSeconds = Math.floor((now.getTime() - new Date(ticket.slaPausedAt).getTime()) / 1000);
        updateData.accumulatedPausedTime = (ticket.accumulatedPausedTime || 0) + pausedSeconds;
        updateData.slaPausedAt = null;
        updateData.lastPausedAt = null;
        
        if (ticket.slaDeadline) {
          updateData.slaDeadline = new Date(new Date(ticket.slaDeadline).getTime() + pausedSeconds * 1000);
        }
        if (ticket.resolutionDeadline) {
          updateData.resolutionDeadline = new Date(new Date(ticket.resolutionDeadline).getTime() + pausedSeconds * 1000);
        }
      }
    } else {
      // Legacy hardcoded logic fallback if no MasterStatus config is found
      if (finalStatus === 'RESOLVED') {
        updateData.isArchived = true;
        updateData.archivedAt = new Date();
        updateData.resolvedAt = new Date();
        updateData.slaTimerActive = false;
      } else {
        updateData.slaTimerActive = true;
        updateData.isArchived = false;
        updateData.archivedAt = null;
        updateData.resolvedAt = null;
      }
      
      const PAUSED_STATES = ['WAITING_FOR_APPROVAL', 'WAITING_FOR_VENDOR', 'WAITING_FOR_CUSTOMER', 'ON_HOLD'];
      const isPausedNow = PAUSED_STATES.includes(finalSubStatus) && finalStatus !== 'CLOSED';

      if (isPausedNow && (!ticket.slaPausedAt && !ticket.lastPausedAt)) {
        updateData.slaPausedAt = new Date();
        updateData.lastPausedAt = new Date();
      } else if (!isPausedNow && (ticket.slaPausedAt || ticket.lastPausedAt)) {
        const pauseStart = ticket.slaPausedAt || ticket.lastPausedAt;
        const now = new Date();
        const pausedSeconds = Math.floor((now.getTime() - new Date(pauseStart).getTime()) / 1000);
        updateData.accumulatedPausedTime = (ticket.accumulatedPausedTime || 0) + pausedSeconds;
        updateData.slaPausedAt = null;
        updateData.lastPausedAt = null;
        
        if (ticket.slaDeadline) {
          updateData.slaDeadline = new Date(new Date(ticket.slaDeadline).getTime() + pausedSeconds * 1000);
        }
        if (ticket.resolutionDeadline) {
          updateData.resolutionDeadline = new Date(new Date(ticket.resolutionDeadline).getTime() + pausedSeconds * 1000);
        }
      }
    }

    if (finalStatus === 'IN_PROGRESS' && !ticket.firstRespondedAt) {
      const now = new Date();
      updateData.firstRespondedAt = now;
      updateData.isTtfrBreached = now > ticket.ttfrDeadline;

      // Keep respondedAt synced for backwards compatibility
      updateData.respondedAt = now;
    }

    if (finalStatus === 'CLOSED' && ticket.status !== 'CLOSED') {
      const now = new Date();
      updateData.closedAt = now;
      if (ticket.slaDeadline && now > ticket.slaDeadline) {
        updateData.isSlaBreached = true;
      }
      if (ticket.resolutionDeadline && now > ticket.resolutionDeadline) {
        updateData.isResolutionBreached = true;
      }

      // Automatically close children and log
      const children = await this.prisma.ticket.findMany({ where: { parentId: ticket.id } });
      if (children.length > 0) {
        await this.prisma.ticket.updateMany({
          where: { parentId: ticket.id, status: { not: 'CLOSED' } },
          data: {
            status: 'CLOSED',
            subStatus: 'NONE',
            closedAt: now,
            isResolutionBreached: ticket.resolutionDeadline ? now > ticket.resolutionDeadline : false,
          }
        });

        for (const child of children) {
          if (child.status !== 'CLOSED') {
            await this.prisma.comment.create({
              data: {
                content: `[SYSTEM MERGE] Parent Ticket #${ticket.ticketSeq} resolved. Cascading CLOSURE to this nested ticket.`,
                isInternal: true,
                type: CommentType.SYSTEM_EVENT,
                ticketId: child.id,
              }
            });
          }
        }
      }
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
    });
    return this.formatTicket(updated);
  }

  async registerAttachmentRecord(numericId: number, fileMeta: any) {
    // We use the numeric sequence id to find the actual ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketSeq: numericId }
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with numeric ID ${numericId} not found`);
    }

    const attachment = await this.prisma.attachment.create({
      data: {
        fileName: fileMeta.fileName,
        filePath: fileMeta.filePath,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size,
        ticketId: ticket.id,
      }
    });

    return attachment;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledTickets() {
    const now = new Date();
    let ticketsToWake = [];

    try {
      ticketsToWake = await this.prisma.ticket.findMany({
        where: {
          OR: [
            { status: 'SCHEDULED' as any },
            { masterStatus: { name: 'SCHEDULED' } }
          ],
          executeAt: {
            lte: now,
          },
        },
      });
    } catch (error) {
      console.error('❌ DB Schema Mismatch in Scheduled Tickets Worker:', error.message);
      return; // Fail gracefully without crashing the NestJS context
    }

    if (ticketsToWake.length === 0) return;

    const cronParser = require('cron-parser');

    await this.prisma.$transaction(async (tx) => {
      for (const ticket of ticketsToWake) {
        // Step B: SLA Generation based on immutable target minutes captured at creation
        const executeTime = new Date();
        const ttfrDeadline = new Date(executeTime.getTime() + ticket.responseTargetMinutes * 60 * 1000);
        const resolutionDeadline = new Date(executeTime.getTime() + ticket.resolutionTargetMinutes * 60 * 1000);
        
        // Use resolutionDeadline as slaDeadline
        const slaDeadline = resolutionDeadline;

        // Step A: Activate the ticket
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.OPEN,
            createdAt: executeTime,
            ttfrDeadline,
            resolutionDeadline,
            slaDeadline,
            executeAt: null,
          },
        });

        await tx.comment.create({
          data: {
            content: "[SYSTEM AUTO-WAKE] Scheduled execution window reached. Ticket restored to active workspace trail.",
            isInternal: true,
            type: CommentType.SYSTEM_EVENT,
            ticketId: ticket.id,
          },
        });

        console.log(`[Cron] Woke up ticket ${ticket.id}`);

        // Step C: Recurrence Check
        if (ticket.isRecurring && ticket.cronExpression) {
          try {
            const interval = cronParser.parseExpression(ticket.cronExpression);
            const nextExecuteAt = interval.next().toDate();

            await tx.ticket.create({
              data: {
                title: ticket.title,
                description: ticket.description,
                priority: ticket.priority,
                category: ticket.category,
                source: ticket.source,
                customerId: ticket.customerId,
                ticketOwnerId: ticket.ticketOwnerId,
                status: TicketStatus.SCHEDULED,
                executeAt: nextExecuteAt,
                isRecurring: true,
                cronExpression: ticket.cronExpression,
                ttfrDeadline: nextExecuteAt, // placeholder
                resolutionDeadline: nextExecuteAt, // placeholder
                slaDeadline: nextExecuteAt, // placeholder
              }
            });
            console.log(`[Cron] Cloned recurring ticket ${ticket.id} for ${nextExecuteAt}`);
          } catch (err) {
            console.error(`[Cron] Invalid cron expression for ticket ${ticket.id}:`, err);
          }
        }
      }
    });
  }

  async mergeTickets(childId: string, parentId: string) {
    const childTicket = await this.findTicketById(childId);
    const parentTicket = await this.findTicketById(parentId);

    if (!childTicket) throw new NotFoundException(`Child ticket ${childId} not found`);
    if (!parentTicket) throw new NotFoundException(`Parent ticket ${parentId} not found`);

    if (childTicket.id === parentTicket.id) {
      throw new BadRequestException('Cannot merge a ticket into itself');
    }

    return this.prisma.$transaction(async (tx) => {
      // Step D: Update child ticket status and notes
      const updatedChild = await tx.ticket.update({
        where: { id: childTicket.id },
        data: {
          parentId: parentTicket.id,
          status: TicketStatus.CLOSED,
          subStatus: SubStatus.NONE,
          description: childTicket.description + `\n\n[SYSTEM] Merged into Primary Ticket T${parentTicket.ticketSeq}`,
        }
      });

      // Step A: Migrate Attachments
      await tx.attachment.updateMany({
        where: { ticketId: childTicket.id },
        data: { ticketId: parentTicket.id }
      });

      // Step B: Migrate Comments / Audit Logs
      await tx.comment.updateMany({
        where: { ticketId: childTicket.id },
        data: { ticketId: parentTicket.id }
      });

      // Step C: Audit Log in Primary Ticket
      await tx.comment.create({
        data: {
          content: `System Consolidated history, logs, and attachments from merged duplicate ticket T${childTicket.ticketSeq}.`,
          isInternal: true,
          type: CommentType.SYSTEM_EVENT,
          ticketId: parentTicket.id,
        }
      });

      return updatedChild;
    });
  }

  // --- DATA LINKAGE MIGRATION SCRIPT ---
  /**
   * Temporary execution function / seeder method to sync existing string statuses 
   * with their relational IDs now that statusId is the source of truth.
   */
  async migrateStatusIds() {
    this.logger.log('Starting Status Data Linkage Migration...');
    
    // 1. READ ALL CURRENT STATUS ROWS
    const masterStatuses = await this.prisma.masterStatus.findMany();
    const statusMap = new Map<string, string>();
    
    for (const status of masterStatuses) {
      statusMap.set(status.name.toUpperCase(), status.id);
    }

    // Fetch tickets that lack a relational binding
    const unlinkedTickets = await this.prisma.ticket.findMany({
      where: {
        statusId: null
      }
    });

    if (unlinkedTickets.length === 0) {
      this.logger.log('All tickets are already linked. Migration skipped.');
      return { status: 'success', message: 'All tickets are already fully linked.' };
    }

    this.logger.log(`Found ${unlinkedTickets.length} unlinked tickets. Beginning batch update...`);

    let updatedCount = 0;
    
    // 2. RUN BULK LINKAGE TRANSITION
    await this.prisma.$transaction(async (tx) => {
      for (const ticket of unlinkedTickets) {
        const rawStatus = ticket.status ? ticket.status.toString().toUpperCase() : 'OPEN';
        let targetId = statusMap.get(rawStatus);
        
        // If exact match isn't found, try falling back to the default OPEN status
        if (!targetId) {
          targetId = statusMap.get('OPEN');
        }

        if (targetId) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { statusId: targetId }
          });
          updatedCount++;
        }
      }
    });

    this.logger.log(`✅ Data Migration Complete: Successfully linked ${updatedCount} tickets to MasterStatus IDs.`);
    return { 
      status: 'success', 
      message: `Successfully linked ${updatedCount} tickets to relational MasterStatus keys.` 
    };
  }
}

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketPriority, TicketStatus, SubStatus, CommentType } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateCoreDataDto } from './dto/update-core-data.dto';
import { SlaService } from './sla.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
  ) {}

  private async findTicketById(idOrSeq: string) {
    const include = {
      comments: {
        orderBy: { createdAt: 'asc' as const },
        include: { author: { select: { id: true, name: true, email: true, role: { select: { name: true } } } } }
      },
      customer: { select: { name: true, email: true } },
      attachments: true,
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
    const { title, description, priority = TicketPriority.LOW, category, source = 'PORTAL', ticketSource } = data;

    let targetCustomerId = user.userId || user.id;
    const hasAdminCreate = user.permissions && user.permissions.includes('TICKET_CREATE_AS_ADMIN');

    if (hasAdminCreate && data.customerId) {
      targetCustomerId = data.customerId;
    }

    const autoCategory = category || 'General Support';

    // Calculate SLA deadline based on priority using SlaService
    const slaDeadline = this.slaService.calculateSlaDeadline(priority);

    // Dynamic SLA Deadlines calculations
    const now = new Date();
    let ttfrHours = 4; // default P4
    let resolutionHours = 48; // default P4

    const priorityStr = String(priority);
    if (priorityStr === 'P1' || priority === TicketPriority.URGENT) {
      ttfrHours = 2;
      resolutionHours = 4;
    } else if (priorityStr === 'P2' || priority === TicketPriority.HIGH) {
      ttfrHours = 2;
      resolutionHours = 6;
    } else if (priorityStr === 'P3' || priority === TicketPriority.MEDIUM) {
      ttfrHours = 4;
      resolutionHours = 12;
    } else if (priorityStr === 'P4' || priority === TicketPriority.LOW) {
      ttfrHours = 4;
      resolutionHours = 48;
    }

    const ttfrDeadline = new Date(now.getTime() + ttfrHours * 60 * 60 * 1000);
    const resolutionDeadline = new Date(now.getTime() + resolutionHours * 60 * 60 * 1000);

    const ticket = await this.prisma.ticket.create({
      data: {
        title,
        description,
        priority,
        category: autoCategory,
        source: ticketSource || source,
        ticketSource: ticketSource || null,
        status: TicketStatus.OPEN,
        slaDeadline,
        ttfrDeadline,
        resolutionDeadline,
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
    const { timeSpentTracking, status, ticketId: _tid, scheduledAt, ...prismaData } = data as any;
    const timeSpentMin = timeSpentTracking !== undefined ? timeSpentTracking : data.timeSpentMin;

    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    try {
      const updated = await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          ...prismaData,
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
    
    // Process subStatus if provided
    if (subStatus) {
      updateData.subStatus = subStatus as SubStatus;
      // Force status to IN_PROGRESS if subStatus is set (unless it's NONE, then we might just be clearing it)
      if (subStatus !== 'NONE') {
        updateData.status = TicketStatus.IN_PROGRESS;
      }
    }
    
    if (status) {
      updateData.status = status as TicketStatus;
      // If status is OPEN or CLOSED, clear subStatus
      if (status === 'OPEN' || status === 'CLOSED') {
        updateData.subStatus = SubStatus.NONE;
      }
    }

    const finalStatus = updateData.status || ticket.status;

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
    const ticketsToWake = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.IN_PROGRESS,
        subStatus: SubStatus.ON_HOLD,
        scheduledAt: {
          lte: now,
        },
      },
    });

    for (const ticket of ticketsToWake) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          subStatus: SubStatus.WORK_IN_PROGRESS,
          scheduledAt: null,
          schedulingReason: null,
        },
      });

      await this.prisma.comment.create({
        data: {
          content: "[SYSTEM AUTO-WAKE] Scheduled execution window reached. Ticket restored to active workspace trail.",
          isInternal: true,
          type: CommentType.SYSTEM_EVENT,
          ticketId: ticket.id,
          // authorId is optional now, leaving it null implies a SYSTEM comment
        },
      });

      console.log(`[Cron] Woke up ticket ${ticket.id}`);
    }
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
      // a. Update child's parentId and statuses
      const updatedChild = await tx.ticket.update({
        where: { id: childTicket.id },
        data: {
          parentId: parentTicket.id,
          status: TicketStatus.IN_PROGRESS,
          subStatus: SubStatus.ON_HOLD,
        }
      });

      // c. Audit Log in Child
      await tx.comment.create({
        data: {
          content: `[SYSTEM MERGE] This ticket has been bundled into Parent Ticket #${parentTicket.ticketSeq}. Monitoring master resolution trail.`,
          isInternal: true,
          type: CommentType.SYSTEM_EVENT,
          ticketId: childTicket.id,
        }
      });

      // d. Audit Log in Parent
      await tx.comment.create({
        data: {
          content: `[SYSTEM MERGE] Child Ticket #${childTicket.ticketSeq} has been successfully nested into this execution sequence.`,
          isInternal: true,
          type: CommentType.SYSTEM_EVENT,
          ticketId: parentTicket.id,
        }
      });

      return updatedChild;
    });
  }
}

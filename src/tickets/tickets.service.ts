import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateCoreDataDto } from './dto/update-core-data.dto';
import { SlaService } from './sla.service';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
  ) {}

  private async findTicketById(idOrSeq: string) {
    // Handle 'T007' format — strip prefix and look up by ticketSeq
    if (/^T\d+$/i.test(idOrSeq)) {
      const seq = parseInt(idOrSeq.replace(/^T/i, ''), 10);
      console.log('[findTicketById] T-format lookup — ticketSeq:', seq);
      return this.prisma.ticket.findUnique({ where: { ticketSeq: seq } });
    }
    // Handle plain numeric string like '7'
    const asNum = parseInt(idOrSeq, 10);
    if (!isNaN(asNum) && String(asNum) === idOrSeq) {
      console.log('[findTicketById] Numeric string lookup — ticketSeq:', asNum);
      return this.prisma.ticket.findUnique({ where: { ticketSeq: asNum } });
    }
    // Fall back to UUID lookup
    console.log('[findTicketById] UUID lookup — id:', idOrSeq);
    return this.prisma.ticket.findUnique({ where: { id: idOrSeq } });
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

  // POST /tickets/:id/comments (Customer)
  async addComment(ticketId: string, authorId: string, content: string) {
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    
    if (ticket.customerId !== authorId) {
      throw new ForbiddenException('You can only comment on your own tickets.');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        ticketId: ticket.id,
        authorId,
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

    // Strip non-Prisma fields before writing to the database
    const { timeSpentTracking, status, ticketId: _tid, ...prismaData } = data as any;
    const timeSpentMin = timeSpentTracking !== undefined ? timeSpentTracking : data.timeSpentMin;

    try {
      const updated = await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          ...prismaData,
          ...(timeSpentMin !== undefined ? { timeSpentMin } : {}),
          slaDeadline,
        },
      });
      console.log('[updateCoreData] Update SUCCESS — seq:', ticket.ticketSeq);
      return this.formatTicket(updated);
    } catch (err) {
      console.error('[updateCoreData] Prisma update FAILED:', err.message);
      throw err;
    }
  }

  async updateStatus(ticketId: string, status: string) {
    const ticket = await this.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updateData: any = { status: status as TicketStatus };

    if (status === 'IN_PROGRESS' && !ticket.firstRespondedAt) {
      const now = new Date();
      updateData.firstRespondedAt = now;
      updateData.isTtfrBreached = now > ticket.ttfrDeadline;
      
      // Keep respondedAt synced for backwards compatibility
      updateData.respondedAt = now;
    }

    if (status === 'CLOSED') {
      const now = new Date();
      updateData.closedAt = now;
      if (ticket.slaDeadline && now > ticket.slaDeadline) {
        updateData.isSlaBreached = true;
      }
      if (ticket.resolutionDeadline && now > ticket.resolutionDeadline) {
        updateData.isResolutionBreached = true;
      }
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
    });
    return this.formatTicket(updated);
  }
}

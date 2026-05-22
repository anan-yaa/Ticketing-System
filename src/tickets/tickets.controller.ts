import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateCoreDataDto } from './dto/update-core-data.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ─── STATIC LITERAL ROUTES FIRST ─────────────────────────────────────────
  // Always declare static/literal routes before any dynamic :id routes.

  @Post()
  @Permissions('TICKET_CREATE')
  async createTicket(@Request() req, @Body() body: CreateTicketDto) {
    return this.ticketsService.createTicket(req.user, body);
  }

  @Get('my-tickets')
  @Permissions('TICKET_VIEW')
  async getMyTickets(@Request() req) {
    return this.ticketsService.getCustomerTickets(req.user.userId);
  }

  @Get('admin/all')
  @Permissions('TICKET_VIEW')
  async getAllTickets() {
    return this.ticketsService.getAllTickets();
  }

  // ─── SPECIFIC SUB-RESOURCE ROUTES BEFORE BARE :id WILDCARDS ─────────────
  // NestJS matches top-to-bottom. If @Patch(':id') appears before
  // @Patch(':id/core-data'), it swallows the request and returns 404.
  // These MUST be above the bare @Patch(':id') / @Delete(':id') handlers.

  @Patch(':id/core-data')
  @Permissions('TICKET_CORE_DATA_UPDATE')
  async updateCoreData(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    console.log('[CORE-DATA] hit — raw id:', id, '| body:', dto);
    // Pass the raw id string directly — the service findTicketById handles T007, 7, or UUID formats
    return this.ticketsService.updateCoreData(id, dto);
  }

  @Patch(':id/status')
  @Permissions('TICKET_UPDATE')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ticketsService.updateStatus(id, status);
  }

  @Patch(':id/close')
  @Permissions('TICKET_CLOSE')
  async closeTicket(@Request() req, @Param('id') id: string) {
    return this.ticketsService.closeTicket(id, req.user.userId);
  }

  @Post(':id/comments')
  @Permissions('TICKET_VIEW')
  async addComment(@Request() req, @Param('id') id: string, @Body('content') content: string) {
    return this.ticketsService.addComment(id, req.user.userId, content);
  }

  // ─── BARE :id WILDCARD ROUTES LAST ───────────────────────────────────────

  @Patch(':id')
  @Permissions('TICKET_UPDATE')
  async updateTicket(@Param('id') id: string, @Body() body: any) {
    return this.ticketsService.updateTicket(id, body);
  }

  @Delete(':id')
  @Permissions('TICKET_UPDATE')
  async deleteTicket(@Param('id') id: string) {
    return this.ticketsService.deleteTicket(id);
  }
}

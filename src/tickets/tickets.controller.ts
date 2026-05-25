import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateCoreDataDto } from './dto/update-core-data.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ─── STATIC LITERAL ROUTES FIRST ─────────────────────────────────────────
  // Always declare static/literal routes before any dynamic :id routes.

  @Post('merge')
  @Permissions('TICKET_UPDATE')
  async mergeTickets(
    @Body('childTicketId') childTicketId: string,
    @Body('parentTicketId') parentTicketId: string,
  ) {
    if (!childTicketId || !parentTicketId) {
      throw new BadRequestException('Both childTicketId and parentTicketId are required');
    }
    return this.ticketsService.mergeTickets(childTicketId, parentTicketId);
  }

  @Post('upload-attachment')
  @Permissions('TICKET_UPDATE')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/attachments',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    })
  }))
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body('ticketId') ticketId: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ticketId) throw new BadRequestException('Ticket ID is required');

    // Strip prefix if necessary, but ticketsService already does this in findTicketById,
    // so we can just pass the ticketId directly. However, the prompt asked to strip
    // prefixes to get the explicit numeric key.
    const numericId = parseInt(ticketId.replace(/\D/g, ''), 10);
    
    // In our service, we can use ticketId or numericId. Let's pass what's required.
    return this.ticketsService.registerAttachmentRecord(numericId, {
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

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
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, dto.status, dto.subStatus);
  }

  @Patch(':id/close')
  @Permissions('TICKET_CLOSE')
  async closeTicket(@Request() req, @Param('id') id: string) {
    return this.ticketsService.closeTicket(id, req.user.userId);
  }

  @Post(':id/messages')
  @Permissions('TICKET_VIEW')
  async addMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { content: string, isInternal: boolean }
  ) {
    return this.ticketsService.addMessage(id, req.user, body.content, body.isInternal);
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

import {
  Controller,
  Get,
  Param,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CoPilotService } from './co-pilot.service';

@Controller('ai/co-pilot')
export class CoPilotController {
  private readonly logger = new Logger(CoPilotController.name);

  constructor(private readonly coPilotService: CoPilotService) {}

  /**
   * Retrieves AI Co-Pilot suggested resolution steps and confidence score for a given ticket.
   * Route: GET /ai/co-pilot/suggestions/:ticketId
   */
  @Get('suggestions/:ticketId')
  @HttpCode(HttpStatus.OK)
  async getSuggestions(@Param('ticketId') ticketId: string) {
    this.logger.log(`Received request for AI Co-Pilot suggestions for ticket ID: [${ticketId}]`);
    return await this.coPilotService.getSuggestions(ticketId);
  }
}

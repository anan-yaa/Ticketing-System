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
  async getSuggestions(@Param('ticketId') ticketId: string): Promise<{
    suggestedSteps: string[];
    confidenceScore: number;
  }> {
    try {
      this.logger.log(`Received request for AI Co-Pilot suggestions for ticket ID: [${ticketId}]`);
      const suggestions = await this.coPilotService.getAiSuggestedSteps(ticketId);
      return suggestions;
    } catch (error: any) {
      if (
        error instanceof NotFoundException ||
        error?.status === 404 ||
        error?.message?.toLowerCase().includes('not found')
      ) {
        this.logger.warn(`Ticket ID [${ticketId}] not found during Co-Pilot suggestion request.`);
        throw new NotFoundException(`Ticket with ID [${ticketId}] does not exist.`);
      }
      this.logger.error(`Error processing AI Co-Pilot suggestions for ticket ID [${ticketId}]:`, error?.stack || error);
      throw new InternalServerErrorException(
        `Failed to generate Co-Pilot suggestions: ${error?.message || 'Internal server error'}`,
      );
    }
  }
}

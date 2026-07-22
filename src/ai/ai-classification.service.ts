import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TicketClassification {
  category: string;
  ticketType: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
}

const CLASSIFICATION_TIMEOUT_MS = 3000;

const VALID_CATEGORIES = [
  'IoT & Edge Engineering',
  'RIMS',
  'Application Platform Support',
  'Network Infrastructure',
  'IT Service Desk & Assets',
  'Cybersecurity Operations',
  'Cloud & DevOps Engineering',
  'Data Analytics & Reporting',
];

const VALID_TICKET_TYPES = [
  'Incident',
  'Service Request',
  'Information',
  'Proactive Notification',
  'Change Request',
  'Problem',
  'Junk (Advertisement)',
];

const FALLBACK_CLASSIFICATION: TicketClassification = {
  category: 'IT Service Desk & Assets',
  ticketType: 'Incident',
  priority: 'MEDIUM',
  summary: 'Ticket requires manual triage and classification.',
};

@Injectable()
export class AiClassificationService {
  private readonly logger = new Logger(AiClassificationService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private readonly modelName = 'gemini-2.0-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey.trim());
      this.logger.log(
        `AiClassificationService initialized with model [${this.modelName}]. Auto-triage engine ready.`,
      );
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not configured. AI triage will use safe fallback defaults on every ticket creation.',
      );
    }
  }

  /**
   * Calls Gemini to classify a ticket by analyzing its title and description.
   * Returns a typed classification object, or fallback defaults on any error/timeout.
   */
  async classifyTicket(
    title: string,
    description: string,
  ): Promise<TicketClassification> {
    if (!this.genAI) {
      this.logger.warn('[AiClassification] No Gemini client. Returning fallback.');
      return FALLBACK_CLASSIFICATION;
    }

    const prompt = `You are an expert IT support ticket classification engine.

Analyze the following IT support ticket and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

The JSON must exactly match this shape:
{
  "category": one of [${VALID_CATEGORIES.map(c => `"${c}"`).join(', ')}],
  "ticketType": one of [${VALID_TICKET_TYPES.map(t => `"${t}"`).join(', ')}],
  "priority": one of ["URGENT", "HIGH", "MEDIUM", "LOW"],
  "summary": "<concise 1-sentence technical summary of the issue>"
}

Choose the most appropriate value for each field based on the ticket content.
Priority rules: URGENT = system down/security breach, HIGH = major function broken, MEDIUM = degraded service, LOW = minor/info request.

Ticket Title: ${title}
Ticket Description: ${description}

Respond with ONLY the JSON object.`;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const result: any = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Gemini classification timed out after ${CLASSIFICATION_TIMEOUT_MS}ms`)),
            CLASSIFICATION_TIMEOUT_MS,
          ),
        ),
      ]);

      const rawText: string = result.response.text().trim();
      this.logger.debug(`[AiClassification] Raw Gemini response: ${rawText.substring(0, 200)}`);

      // Strip any accidental markdown code fences Gemini may return
      const jsonStr = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(jsonStr) as Partial<TicketClassification>;

      const classification: TicketClassification = {
        category: VALID_CATEGORIES.includes(parsed.category as string)
          ? (parsed.category as string)
          : FALLBACK_CLASSIFICATION.category,
        ticketType: VALID_TICKET_TYPES.includes(parsed.ticketType as string)
          ? (parsed.ticketType as string)
          : FALLBACK_CLASSIFICATION.ticketType,
        priority: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(parsed.priority as string)
          ? (parsed.priority as TicketClassification['priority'])
          : FALLBACK_CLASSIFICATION.priority,
        summary: (parsed.summary && parsed.summary.trim().length > 0)
          ? parsed.summary.trim()
          : FALLBACK_CLASSIFICATION.summary,
      };

      this.logger.log(
        `[AiClassification] Ticket classified → category: "${classification.category}", ` +
        `type: "${classification.ticketType}", priority: "${classification.priority}"`,
      );

      return classification;
    } catch (error: any) {
      this.logger.warn(
        `[AiClassification] Classification failed (${error.message}). Using fallback defaults.`,
      );
      return FALLBACK_CLASSIFICATION;
    }
  }
}

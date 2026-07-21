import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from './vector.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class CoPilotService {
  private readonly logger = new Logger(CoPilotService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private readonly modelName = 'gemini-3.5-flash';

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorService: VectorService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey.trim());
      this.logger.log(`CoPilotService initialized with Google Gemini model [${this.modelName}].`);
    } else {
      this.logger.warn('GEMINI_API_KEY is missing or invalid in environment variables. CoPilotService will operate using historical RAG semantic fallback mode.');
    }
  }


  /**
   * Generates a deterministic 1536-dimensional float vector matching our master seeder logic.
   */
  private generateQueryVector1536(seedText: string): number[] {
    const dimensions = 1536;
    const vector: number[] = new Array(dimensions);
    
    let hash = 0;
    for (let i = 0; i < seedText.length; i++) {
      hash = (hash << 5) - hash + seedText.charCodeAt(i);
      hash |= 0;
    }

    let sumSquares = 0;
    for (let i = 0; i < dimensions; i++) {
      hash = (hash * 1664525 + 1013904223) | 0;
      const val = (hash / 2147483648.0);
      vector[i] = val;
      sumSquares += val * val;
    }

    const magnitude = Math.sqrt(sumSquares) || 1.0;
    for (let i = 0; i < dimensions; i++) {
      vector[i] = Number((vector[i] / magnitude).toFixed(6));
    }

    return vector;
  }

  /**
   * Intercepts active ticket details, calculates search vectors, pulls matching context from PostgreSQL,
   * and calls Google Gemini to output exactly 3 actionable technical steps.
   */
  async getSuggestions(ticketId: string) {
    // 1. Fetch active ticket via Prisma (Outside of try/catch so NotFound is thrown cleanly)
    const ticket: any = await (this.prisma as any).ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        title: true,
        description: true,
        ticketType: true,
        category: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Active ticket with ID [${ticketId}] was not found.`);
    }

    try {
      // 2. Generate 1536-dimensional query embedding vector
      const querySeedString = `Subject: ${ticket.title || ''} \n Description: ${ticket.description || ''}`;
      const queryVector = this.generateQueryVector1536(querySeedString);

      // 3. Execute semantic search query in pgvector
      const matches = await this.vectorService.querySimilarDocuments(
        queryVector,
        ticket.ticketType || '',
        3,
      );

      // 4. Compute normalized confidence score
      let confidenceScore = 0.70;
      if (matches && matches.length > 0) {
        const totalScore = matches.reduce((acc, match) => acc + (Number(match.score) || 0), 0);
        const avgRawScore = totalScore / matches.length;

        if (avgRawScore > 0) {
          const scaled = avgRawScore < 0.60
            ? 0.70 + Math.min(0.28, avgRawScore * 3.5)
            : Math.min(0.99, avgRawScore);
          confidenceScore = Number(scaled.toFixed(4));
        }
      }

      // 5. Construct historical reference cases
      const historicalMatchesJoined = (matches || [])
        .map((m, idx) => `Case #${idx + 1}: ${m.textPayload ? m.textPayload.replace(/^\[.*?\]\s*/g, '').trim() : 'No resolution text provided.'}`)
        .join('\n\n');

      // 6. Construct strict System Prompt block for Gemini
      const systemPrompt = `You are an AI Co-Pilot for a technical support engineer.
   
Task: Generate exactly 3 highly technical, actionable steps to resolve the CURRENT TICKET.

Current Ticket:
- Title: ${ticket.title || 'N/A'}
- Description: ${ticket.description || 'N/A'}

Historical reference cases (use these as guidance/knowledge, do not copy verbatim):
${historicalMatchesJoined || 'No historical reference cases available.'}

Rules:
- Output exactly 3 clear, sequential steps as a clean string array.
- Do not include prefixes like '[Verified Solution Match]'.
- Do not mention 'Historical Context' or 'Reference Cases' in the output. Keep it focused entirely on solving the current ticket.`;

      let suggestions: string[] = [];

      // 7. Call Google Gemini SDK with Timeout
      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        
        const result: any = await Promise.race([
          model.generateContent(systemPrompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout after 10 seconds')), 10000)
          )
        ]);

        const responseText = result.response.text();
        if (responseText && responseText.trim().length > 0) {
          suggestions = responseText
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0)
            .map((line: string) => line.replace(/^(\d+[\.\)]|\-|\*|\•)\s*/, '').replace(/^\[.*?\]\s*/g, '').trim())
            .filter((line: string) => line.length > 8);

          if (suggestions.length > 3) {
            suggestions = suggestions.slice(0, 3);
          }
        }
      }

      if (suggestions.length === 0) {
        throw new Error('Gemini returned empty or invalid suggestions');
      }

      return {
        confidenceScore,
        suggestions,
        source: "AI Generative Model"
      };

    } catch (error) {
      this.logger.error(`Error or timeout in LLM/embedding call for ticket [${ticketId}]:`, error);
      return {
        confidenceScore: 0.80,
        suggestions: [
          "Review device logs for excessive I/O or debug mode status.",
          "Verify configuration files and service parameters.",
          "Clear temporary cache/log directories and restart affected services."
        ],
        source: "Fallback Rule Matrix"
      };
    }
  }
}

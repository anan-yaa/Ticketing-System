import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Single source of truth for every embedding in the app (indexing, search, backfills).
 * Stored vectors and query vectors MUST come from the same model, so there is
 * deliberately no fallback here: on any failure this throws, and callers decide
 * how to degrade (skip retrieval, retry indexing later) instead of writing fake vectors.
 */

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMS = 1536;
const EMBEDDING_TIMEOUT_MS = 8000;

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0 || apiKey === 'your-gemini-api-key') {
    throw new Error('GEMINI_API_KEY is not configured; cannot generate embeddings.');
  }
  genAI = new GoogleGenerativeAI(apiKey.trim());
  return genAI;
}

export async function embedText(text: string, taskType: EmbeddingTaskType): Promise<number[]> {
  const model = getClient().getGenerativeModel({ model: EMBEDDING_MODEL });

  const result: any = await Promise.race([
    model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      taskType,
      outputDimensionality: EMBEDDING_DIMS,
    } as any),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Embedding timeout after ${EMBEDDING_TIMEOUT_MS}ms`)), EMBEDDING_TIMEOUT_MS)
    ),
  ]);

  const rawVector: number[] | undefined = result?.embedding?.values;
  if (!rawVector || rawVector.length !== EMBEDDING_DIMS) {
    throw new Error(`${EMBEDDING_MODEL} returned ${rawVector?.length ?? 0} dims, expected ${EMBEDDING_DIMS}.`);
  }

  // Reduced-dimension Gemini embeddings must be re-normalized
  const mag = Math.sqrt(rawVector.reduce((acc, v) => acc + v * v, 0)) || 1;
  return rawVector.map(v => v / mag);
}

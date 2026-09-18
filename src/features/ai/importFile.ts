import type { CardInput } from "@/domain/models";
import { analyzeCards } from "@/features/ai/analyzeClient";

export function parseWords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const w = raw.trim();
    if (w && !seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

export interface ImportProgress {
  done: number;
  total: number;
}

export interface ImportResult {
  cards: CardInput[];
  errors: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function analyzeInBatches(
  words: string[],
  batchSize = 5,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const batches = chunk(words, batchSize);
  const cards: CardInput[] = [];
  let errors = 0;
  let done = 0;

  for (const batch of batches) {
    try {
      const result = await analyzeCards(batch.join("\n"));
      cards.push(...result);
    } catch {
      errors += 1;
    }
    done += batch.length;
    onProgress?.({ done, total: words.length });
  }

  return { cards, errors };
}

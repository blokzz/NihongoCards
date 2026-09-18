import type { CardInput } from "@/domain/models";
import { getIngestUrl } from "@/lib/config";
import { httpFetch } from "@/lib/http";

export async function ingestCard(card: CardInput): Promise<string | null> {
  const url = getIngestUrl();
  if (!url) return null;

  const payload = {
    main_text: card.front,
    reading: card.furigana || card.reading || undefined,
    card_type: card.card_type ?? "vocabulary",
    translation: card.back || (card.meanings ?? []).join("; ") || undefined,
    jlpt: card.jlpt ?? undefined,
    examples: (card.examples ?? []).map((e) => ({
      sentence: e.text,
      translation: e.translation,
    })),
  };

  try {
    const res = await httpFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as
      | string
      | { word_id?: string; lemma?: string; source_id?: string };
    if (typeof data === "string") return data || null;
    return data.word_id ?? data.lemma ?? data.source_id ?? null;
  } catch {
    return null;
  }
}

import type { CardInput, CardType, Example } from "@/domain/models";
import { getAnalyzeUrl } from "@/lib/config";
import { httpFetch } from "@/lib/http";

interface RawExample {
  text?: string;
  sentence?: string;
  reading?: string;
  furigana?: string;
  translation?: string;
}

interface RawCard {
  front?: string;
  back?: string;
  furigana?: string;
  reading?: string;
  onyomi?: string;
  kunyomi?: string;
  card_type?: string;
  jlpt?: CardInput["jlpt"];
  register?: string;
  usage_note?: string;
  meanings?: string[];
  examples?: RawExample[];
  synonyms?: string[];
  source_id?: string;
  id?: string;
}

function normalizeExample(e: RawExample): Example {
  return {
    text: e.text ?? e.sentence ?? "",
    reading: e.furigana ?? e.reading ?? undefined,
    translation: e.translation ?? undefined,
  };
}

const CARD_TYPES = new Set<CardType>(["vocabulary", "phrase", "kanji", "grammar", "onomatopoeia"]);
const JLPT_LEVELS = new Set(["N5", "N4", "N3", "N2", "N1"]);
const REGISTERS = new Set(["casual", "formal", "literary", "neutral"]);

function cleanCardType(v: unknown): CardType {
  return typeof v === "string" && CARD_TYPES.has(v as CardType) ? (v as CardType) : "vocabulary";
}

function cleanJlpt(v: unknown): CardInput["jlpt"] {
  return typeof v === "string" && JLPT_LEVELS.has(v) ? (v as CardInput["jlpt"]) : undefined;
}

function cleanRegister(v: unknown): CardInput["register"] {
  return typeof v === "string" && REGISTERS.has(v) ? (v as CardInput["register"]) : undefined;
}

function normalizeCard(raw: RawCard, fallbackFront = ""): CardInput {
  return {
    front: raw.front || fallbackFront,
    back: raw.back ?? "",
    furigana: raw.furigana ?? "",
    reading: raw.reading ?? "",
    onyomi: raw.onyomi ?? "",
    kunyomi: raw.kunyomi ?? "",
    card_type: cleanCardType(raw.card_type),
    jlpt: cleanJlpt(raw.jlpt),
    register: cleanRegister(raw.register),
    usage_note: raw.usage_note?.trim() || undefined,
    meanings: raw.meanings ?? [],
    examples: (raw.examples ?? []).map(normalizeExample).filter((e) => e.text.trim()),
    synonyms: raw.synonyms ?? [],
    source_id: raw.source_id ?? raw.id ?? undefined,
  };
}

const MOCK_DICT: Record<string, RawCard> = {
  食べる: { front: "食べる", furigana: "たべる", card_type: "vocabulary", jlpt: "N5", meanings: ["jeść", "spożywać"], examples: [{ sentence: "ご飯を食べる", furigana: "ごはんをたべる", translation: "jeść posiłek" }] },
  水: { front: "水", furigana: "みず", card_type: "vocabulary", jlpt: "N5", meanings: ["woda"], examples: [{ sentence: "水を飲む", furigana: "みずをのむ", translation: "pić wodę" }] },
  勉強: { front: "勉強", furigana: "べんきょう", card_type: "vocabulary", jlpt: "N5", meanings: ["nauka", "studiowanie"], examples: [{ sentence: "日本語を勉強する", furigana: "にほんごをべんきょうする", translation: "uczyć się japońskiego" }] },
};

function mockAnalyze(text: string): CardInput[] {
  const words = text.split(/[,\n]+/).map((w) => w.trim()).filter(Boolean);
  const list = words.length ? words : [text.trim()];
  return list.map((w) => normalizeCard(MOCK_DICT[w] ?? { front: w }, w));
}

export async function analyzeCards(text: string): Promise<CardInput[]> {
  const url = getAnalyzeUrl();
  if (!url) {
    await new Promise((r) => setTimeout(r, 250));
    return mockAnalyze(text);
  }

  const res = await httpFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Analiza nie powiodła się (HTTP ${res.status})`);

  const data = (await res.json()) as RawCard[] | RawCard;
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((c) => normalizeCard(c, text.trim()));
}

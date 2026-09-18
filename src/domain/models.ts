export type CardType = "vocabulary" | "phrase" | "kanji" | "grammar" | "onomatopoeia";

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type Register = "casual" | "formal" | "literary" | "neutral";

export type FsrsState = 0 | 1 | 2 | 3;

export type Rating = 1 | 2 | 3 | 4;

export type LearnedStatus = "not_learned" | "partial" | "learned";

export interface Example {
  text: string;
  reading?: string;
  translation?: string;
}

export interface Card {
  id: number;
  deckId: number;

  front: string;
  back?: string | null;
  furigana?: string | null;
  reading?: string | null;
  onyomi?: string | null;
  kunyomi?: string | null;

  cardType: CardType;
  jlpt?: JlptLevel | null;
  register?: Register | null;
  usageNote?: string | null;

  meanings: string[];
  examples: Example[];
  synonyms: string[];

  sourceId?: string | null;

  correct: number;
  incorrect: number;

  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: FsrsState;
  lastReview?: string | null;
}

export interface Deck {
  id: number;
  name: string;
  createdAt: string;
}

export function learnedStatusFromState(state: FsrsState): LearnedStatus {
  switch (state) {
    case 0:
      return "not_learned";
    case 1:
    case 3:
      return "partial";
    case 2:
      return "learned";
  }
}

export interface CardInput {
  front: string;
  back?: string;
  furigana?: string;
  reading?: string;
  onyomi?: string;
  kunyomi?: string;
  card_type?: CardType;
  jlpt?: JlptLevel;
  register?: Register;
  usage_note?: string;
  meanings?: string[];
  examples?: Example[];
  synonyms?: string[];
  source_id?: string;
}

export interface DeckFile {
  name: string;
  cards: CardInput[];
}

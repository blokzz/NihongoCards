import type { Card, CardInput, Deck } from "@/domain/models";
import type { ThemeName } from "@/lib/theme";

export interface FsrsSnapshot {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: Card["state"];
  lastReview: string | null;
}

export interface ReviewLog extends FsrsSnapshot {
  rating: number;
  lastElapsedDays: number;
  reviewedAt: string;
}

export interface Progress {
  xp: number;
  level: number;
  theme: ThemeName;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface Store {
  init(): Promise<void>;

  listDecks(): Promise<Deck[]>;
  getDeck(id: number): Promise<Deck | null>;
  createDeck(name: string): Promise<number>;
  renameDeck(id: number, name: string): Promise<void>;
  deleteDeck(id: number): Promise<void>;

  getCards(deckId: number): Promise<Card[]>;
  getCard(id: number): Promise<Card | null>;
  getDueCards(deckId: number, limit?: number): Promise<Card[]>;
  getRandomCard(deckId: number): Promise<Card | null>;
  insertCard(deckId: number, card: CardInput): Promise<number>;
  updateCard(id: number, card: CardInput): Promise<void>;
  deleteCard(id: number): Promise<void>;
  setSourceId(cardId: number, sourceId: string): Promise<void>;

  saveReview(
    cardId: number,
    snapshot: FsrsSnapshot,
    log: ReviewLog,
    correct: boolean
  ): Promise<void>;

  getProgress(): Promise<Progress>;
  setTheme(theme: ThemeName): Promise<void>;
  addXp(delta: number): Promise<Progress>;

  getHeatmap(days?: number): Promise<HeatmapDay[]>;
}

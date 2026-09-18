import type { Card, CardInput, Deck } from "@/domain/models";
import type { ThemeName } from "@/lib/theme";
import { levelForXp } from "@/lib/xp";
import { emptyFsrsSnapshot } from "@/domain/srs";
import type {
  FsrsSnapshot,
  HeatmapDay,
  Progress,
  ReviewLog,
  Store,
} from "@/data/store";

const KEY = "nihongo-cards:db:v1";

interface DbShape {
  decks: Deck[];
  cards: Card[];
  logs: ReviewLog[];
  progress: Progress;
  seq: { deck: number; card: number };
}

function emptyDb(): DbShape {
  return {
    decks: [],
    cards: [],
    logs: [],
    progress: { xp: 0, level: 0, theme: "red" },
    seq: { deck: 0, card: 0 },
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function cardFromInput(id: number, deckId: number, c: CardInput): Card {
  const snap = emptyFsrsSnapshot();
  return {
    id,
    deckId,
    front: c.front,
    back: c.back ?? null,
    furigana: c.furigana ?? null,
    reading: c.reading ?? null,
    onyomi: c.onyomi ?? null,
    kunyomi: c.kunyomi ?? null,
    cardType: c.card_type ?? "vocabulary",
    jlpt: c.jlpt ?? null,
    register: c.register ?? null,
    usageNote: c.usage_note ?? null,
    meanings: c.meanings ?? [],
    examples: c.examples ?? [],
    synonyms: c.synonyms ?? [],
    sourceId: c.source_id ?? null,
    correct: 0,
    incorrect: 0,
    ...snap,
  };
}

export class WebStore implements Store {
  private db: DbShape = emptyDb();

  private load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this.db = raw ? { ...emptyDb(), ...JSON.parse(raw) } : emptyDb();
    } catch {
      this.db = emptyDb();
    }
  }

  private save(): void {
    localStorage.setItem(KEY, JSON.stringify(this.db));
  }

  async init(): Promise<void> {
    this.load();
    this.save();
  }

  async listDecks(): Promise<Deck[]> {
    return [...this.db.decks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getDeck(id: number): Promise<Deck | null> {
    return this.db.decks.find((d) => d.id === id) ?? null;
  }

  async createDeck(name: string): Promise<number> {
    const id = ++this.db.seq.deck;
    this.db.decks.push({ id, name, createdAt: new Date().toISOString() });
    this.save();
    return id;
  }

  async renameDeck(id: number, name: string): Promise<void> {
    const d = this.db.decks.find((x) => x.id === id);
    if (d) d.name = name;
    this.save();
  }

  async deleteDeck(id: number): Promise<void> {
    this.db.decks = this.db.decks.filter((d) => d.id !== id);
    this.db.cards = this.db.cards.filter((c) => c.deckId !== id);
    this.save();
  }

  async getCards(deckId: number): Promise<Card[]> {
    return this.db.cards.filter((c) => c.deckId === deckId);
  }

  async getCard(id: number): Promise<Card | null> {
    return this.db.cards.find((c) => c.id === id) ?? null;
  }

  async getDueCards(deckId: number, limit = 20): Promise<Card[]> {
    const now = Date.now();
    return this.db.cards
      .filter((c) => c.deckId === deckId && new Date(c.due).getTime() <= now)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, limit);
  }

  async getRandomCard(deckId: number): Promise<Card | null> {
    const cards = this.db.cards.filter((c) => c.deckId === deckId);
    if (!cards.length) return null;
    return cards[Math.floor(Math.random() * cards.length)];
  }

  async insertCard(deckId: number, input: CardInput): Promise<number> {
    const id = ++this.db.seq.card;
    this.db.cards.push(cardFromInput(id, deckId, input));
    this.save();
    return id;
  }

  async updateCard(id: number, input: CardInput): Promise<void> {
    const c = this.db.cards.find((x) => x.id === id);
    if (!c) return;
    c.front = input.front;
    c.back = input.back ?? null;
    c.furigana = input.furigana ?? null;
    c.reading = input.reading ?? null;
    c.onyomi = input.onyomi ?? null;
    c.kunyomi = input.kunyomi ?? null;
    c.cardType = input.card_type ?? c.cardType;
    c.jlpt = input.jlpt ?? null;
    c.register = input.register ?? null;
    c.usageNote = input.usage_note ?? null;
    c.meanings = input.meanings ?? [];
    c.examples = input.examples ?? [];
    c.synonyms = input.synonyms ?? [];
    this.save();
  }

  async deleteCard(id: number): Promise<void> {
    this.db.cards = this.db.cards.filter((c) => c.id !== id);
    this.save();
  }

  async setSourceId(cardId: number, sourceId: string): Promise<void> {
    const c = this.db.cards.find((x) => x.id === cardId);
    if (c) c.sourceId = sourceId;
    this.save();
  }

  async saveReview(
    cardId: number,
    snap: FsrsSnapshot,
    log: ReviewLog,
    correct: boolean
  ): Promise<void> {
    const c = this.db.cards.find((x) => x.id === cardId);
    if (!c) return;
    Object.assign(c, snap);
    if (correct) c.correct += 1;
    else c.incorrect += 1;
    this.db.logs.push(log);
    this.save();
  }

  async getProgress(): Promise<Progress> {
    return { ...this.db.progress };
  }

  async setTheme(theme: ThemeName): Promise<void> {
    this.db.progress.theme = theme;
    this.save();
  }

  async addXp(delta: number): Promise<Progress> {
    this.db.progress.xp += delta;
    this.db.progress.level = levelForXp(this.db.progress.xp);
    this.save();
    return { ...this.db.progress };
  }

  async getHeatmap(days = 365): Promise<HeatmapDay[]> {
    const counts = new Map<string, number>();
    for (const log of this.db.logs) {
      const day = log.reviewedAt.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    const out: HeatmapDay[] = [];
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: counts.get(key) ?? 0 });
    }
    if (!out.some((x) => x.date === today())) {
      out.push({ date: today(), count: counts.get(today()) ?? 0 });
    }
    return out;
  }
}

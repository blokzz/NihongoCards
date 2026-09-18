import Database from "@tauri-apps/plugin-sql";
import schemaSql from "@/data/schema.sql?raw";
import type { Card, CardInput, Deck, Example } from "@/domain/models";
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

interface CardRow {
  id: number;
  deck_id: number;
  front: string;
  back: string | null;
  furigana: string | null;
  reading: string | null;
  onyomi: string | null;
  kunyomi: string | null;
  card_type: Card["cardType"];
  jlpt: Card["jlpt"];
  register: Card["register"];
  usage_note: string | null;
  meanings: string;
  examples: string;
  synonyms: string;
  source_id: string | null;
  correct: number;
  incorrect: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: Card["state"];
  last_review: string | null;
}

function parseArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function rowToCard(r: CardRow): Card {
  return {
    id: r.id,
    deckId: r.deck_id,
    front: r.front,
    back: r.back,
    furigana: r.furigana,
    reading: r.reading,
    onyomi: r.onyomi,
    kunyomi: r.kunyomi,
    cardType: r.card_type,
    jlpt: r.jlpt,
    register: r.register,
    usageNote: r.usage_note,
    meanings: parseArray<string>(r.meanings),
    examples: parseArray<Example>(r.examples),
    synonyms: parseArray<string>(r.synonyms),
    sourceId: r.source_id,
    correct: r.correct,
    incorrect: r.incorrect,
    due: r.due,
    stability: r.stability,
    difficulty: r.difficulty,
    elapsedDays: r.elapsed_days,
    scheduledDays: r.scheduled_days,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state,
    lastReview: r.last_review,
  };
}

export class SqliteStore implements Store {
  private db: Database | null = null;

  private async conn(): Promise<Database> {
    if (!this.db) this.db = await Database.load("sqlite:nihongo.db");
    return this.db;
  }

  async init(): Promise<void> {
    const db = await this.conn();
    for (const stmt of schemaSql.split(/;\s*\n/)) {
      const sql = stmt.trim();
      if (sql) await db.execute(sql);
    }
    for (const col of ["source_id TEXT", "register TEXT", "usage_note TEXT"]) {
      try {
        await db.execute(`ALTER TABLE cards ADD COLUMN ${col}`);
      } catch {
      }
    }
    try {
      await this.migrateDropChecks(db);
    } catch (e) {
      console.error("migrateDropChecks failed (kontynuuję bez migracji):", e);
    }
  }

  private async migrateDropChecks(db: Database): Promise<void> {
    const rows = await db.select<{ sql: string }[]>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='cards'"
    );
    if (!rows[0]?.sql?.includes("CHECK")) return;

    const cols =
      "id, deck_id, front, back, furigana, reading, onyomi, kunyomi, card_type, jlpt, " +
      "register, usage_note, meanings, examples, synonyms, source_id, correct, incorrect, due, stability, " +
      "difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review";

    await db.execute("PRAGMA foreign_keys=OFF");
    await db.execute("DROP TABLE IF EXISTS cards_new");
    await db.execute(`
      CREATE TABLE cards_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        front TEXT NOT NULL, back TEXT, furigana TEXT, reading TEXT, onyomi TEXT, kunyomi TEXT,
        card_type TEXT NOT NULL DEFAULT 'vocabulary', jlpt TEXT, register TEXT, usage_note TEXT,
        meanings TEXT NOT NULL DEFAULT '[]', examples TEXT NOT NULL DEFAULT '[]', synonyms TEXT NOT NULL DEFAULT '[]',
        source_id TEXT, correct INTEGER NOT NULL DEFAULT 0, incorrect INTEGER NOT NULL DEFAULT 0,
        due TEXT NOT NULL DEFAULT (datetime('now')), stability REAL NOT NULL DEFAULT 0, difficulty REAL NOT NULL DEFAULT 0,
        elapsed_days INTEGER NOT NULL DEFAULT 0, scheduled_days INTEGER NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0, state INTEGER NOT NULL DEFAULT 0, last_review TEXT
      )`);
    await db.execute(`INSERT INTO cards_new (${cols}) SELECT ${cols} FROM cards`);
    await db.execute("DROP TABLE cards");
    await db.execute("ALTER TABLE cards_new RENAME TO cards");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(deck_id, due)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(deck_id, state)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source_id)");
    await db.execute("PRAGMA foreign_keys=ON");
  }

  async listDecks(): Promise<Deck[]> {
    const db = await this.conn();
    return db.select<Deck[]>(
      "SELECT id, name, created_at AS createdAt FROM decks ORDER BY created_at DESC"
    );
  }

  async getDeck(id: number): Promise<Deck | null> {
    const db = await this.conn();
    const rows = await db.select<Deck[]>(
      "SELECT id, name, created_at AS createdAt FROM decks WHERE id = $1",
      [id]
    );
    return rows[0] ?? null;
  }

  async createDeck(name: string): Promise<number> {
    const db = await this.conn();
    const res = await db.execute("INSERT INTO decks (name) VALUES ($1)", [name]);
    return res.lastInsertId ?? -1;
  }

  async renameDeck(id: number, name: string): Promise<void> {
    const db = await this.conn();
    await db.execute("UPDATE decks SET name = $1 WHERE id = $2", [name, id]);
  }

  async deleteDeck(id: number): Promise<void> {
    const db = await this.conn();
    await db.execute("DELETE FROM decks WHERE id = $1", [id]);
  }

  async getCards(deckId: number): Promise<Card[]> {
    const db = await this.conn();
    const rows = await db.select<CardRow[]>(
      "SELECT * FROM cards WHERE deck_id = $1 ORDER BY id",
      [deckId]
    );
    return rows.map(rowToCard);
  }

  async getCard(id: number): Promise<Card | null> {
    const db = await this.conn();
    const rows = await db.select<CardRow[]>("SELECT * FROM cards WHERE id = $1", [id]);
    return rows[0] ? rowToCard(rows[0]) : null;
  }

  async getDueCards(deckId: number, limit = 20): Promise<Card[]> {
    const db = await this.conn();
    const rows = await db.select<CardRow[]>(
      `SELECT * FROM cards WHERE deck_id = $1 AND datetime(due) <= datetime('now')
         ORDER BY datetime(due) ASC LIMIT $2`,
      [deckId, limit]
    );
    return rows.map(rowToCard);
  }

  async getRandomCard(deckId: number): Promise<Card | null> {
    const db = await this.conn();
    const rows = await db.select<CardRow[]>(
      "SELECT * FROM cards WHERE deck_id = $1 ORDER BY RANDOM() LIMIT 1",
      [deckId]
    );
    return rows[0] ? rowToCard(rows[0]) : null;
  }

  async insertCard(deckId: number, c: CardInput): Promise<number> {
    const db = await this.conn();
    const snap = emptyFsrsSnapshot();
    const res = await db.execute(
      `INSERT INTO cards
         (deck_id, front, back, furigana, reading, onyomi, kunyomi,
          card_type, jlpt, register, usage_note, meanings, examples, synonyms, source_id,
          due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
      [
        deckId,
        c.front,
        c.back ?? null,
        c.furigana ?? null,
        c.reading ?? null,
        c.onyomi ?? null,
        c.kunyomi ?? null,
        c.card_type ?? "vocabulary",
        c.jlpt ?? null,
        c.register ?? null,
        c.usage_note ?? null,
        JSON.stringify(c.meanings ?? []),
        JSON.stringify(c.examples ?? []),
        JSON.stringify(c.synonyms ?? []),
        c.source_id ?? null,
        snap.due,
        snap.stability,
        snap.difficulty,
        snap.elapsedDays,
        snap.scheduledDays,
        snap.reps,
        snap.lapses,
        snap.state,
        snap.lastReview,
      ]
    );
    return res.lastInsertId ?? -1;
  }

  async updateCard(id: number, c: CardInput): Promise<void> {
    const db = await this.conn();
    await db.execute(
      `UPDATE cards SET
         front=$1, back=$2, furigana=$3, reading=$4, onyomi=$5, kunyomi=$6,
         card_type=$7, jlpt=$8, register=$9, usage_note=$10, meanings=$11, examples=$12, synonyms=$13
       WHERE id=$14`,
      [
        c.front,
        c.back ?? null,
        c.furigana ?? null,
        c.reading ?? null,
        c.onyomi ?? null,
        c.kunyomi ?? null,
        c.card_type ?? "vocabulary",
        c.jlpt ?? null,
        c.register ?? null,
        c.usage_note ?? null,
        JSON.stringify(c.meanings ?? []),
        JSON.stringify(c.examples ?? []),
        JSON.stringify(c.synonyms ?? []),
        id,
      ]
    );
  }

  async deleteCard(id: number): Promise<void> {
    const db = await this.conn();
    await db.execute("DELETE FROM cards WHERE id = $1", [id]);
  }

  async setSourceId(cardId: number, sourceId: string): Promise<void> {
    const db = await this.conn();
    await db.execute("UPDATE cards SET source_id = $1 WHERE id = $2", [sourceId, cardId]);
  }

  async saveReview(
    cardId: number,
    s: FsrsSnapshot,
    log: ReviewLog,
    correct: boolean
  ): Promise<void> {
    const db = await this.conn();
    await db.execute(
      `UPDATE cards SET
         due=$1, stability=$2, difficulty=$3, elapsed_days=$4, scheduled_days=$5,
         reps=$6, lapses=$7, state=$8, last_review=$9,
         correct = correct + $10, incorrect = incorrect + $11
       WHERE id=$12`,
      [
        s.due,
        s.stability,
        s.difficulty,
        s.elapsedDays,
        s.scheduledDays,
        s.reps,
        s.lapses,
        s.state,
        s.lastReview,
        correct ? 1 : 0,
        correct ? 0 : 1,
        cardId,
      ]
    );
    await db.execute(
      `INSERT INTO review_logs
         (card_id, rating, state, due, stability, difficulty,
          elapsed_days, last_elapsed_days, scheduled_days, reviewed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        cardId,
        log.rating,
        log.state,
        log.due,
        log.stability,
        log.difficulty,
        log.elapsedDays,
        log.lastElapsedDays,
        log.scheduledDays,
        log.reviewedAt,
      ]
    );
  }

  async getProgress(): Promise<Progress> {
    const db = await this.conn();
    const rows = await db.select<Progress[]>(
      "SELECT xp, level, theme FROM user_progress WHERE id = 1"
    );
    return rows[0] ?? { xp: 0, level: 0, theme: "red" };
  }

  async setTheme(theme: ThemeName): Promise<void> {
    const db = await this.conn();
    await db.execute("UPDATE user_progress SET theme = $1 WHERE id = 1", [theme]);
  }

  async addXp(delta: number): Promise<Progress> {
    const db = await this.conn();
    const cur = await this.getProgress();
    const xp = cur.xp + delta;
    const level = levelForXp(xp);
    await db.execute("UPDATE user_progress SET xp = $1, level = $2 WHERE id = 1", [
      xp,
      level,
    ]);
    return { xp, level, theme: cur.theme };
  }

  async getHeatmap(days = 365): Promise<HeatmapDay[]> {
    const db = await this.conn();
    const rows = await db.select<{ day: string; count: number }[]>(
      `SELECT date(reviewed_at) AS day, COUNT(*) AS count
         FROM review_logs
         WHERE reviewed_at >= date('now', $1)
         GROUP BY day`,
      [`-${days - 1} days`]
    );
    const counts = new Map(rows.map((r) => [r.day, r.count]));
    const out: HeatmapDay[] = [];
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return out;
  }
}

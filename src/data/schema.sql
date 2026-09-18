PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS decks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id        INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,

    front          TEXT NOT NULL,
    back           TEXT,
    furigana       TEXT,
    reading        TEXT,
    onyomi         TEXT,
    kunyomi        TEXT,

    card_type      TEXT NOT NULL DEFAULT 'vocabulary',
    jlpt           TEXT,
    register       TEXT,
    usage_note     TEXT,

    meanings       TEXT NOT NULL DEFAULT '[]',
    examples       TEXT NOT NULL DEFAULT '[]',
    synonyms       TEXT NOT NULL DEFAULT '[]',

    source_id      TEXT,

    correct        INTEGER NOT NULL DEFAULT 0,
    incorrect      INTEGER NOT NULL DEFAULT 0,

    due            TEXT NOT NULL DEFAULT (datetime('now')),
    stability      REAL NOT NULL DEFAULT 0,
    difficulty     REAL NOT NULL DEFAULT 0,
    elapsed_days   INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps           INTEGER NOT NULL DEFAULT 0,
    lapses         INTEGER NOT NULL DEFAULT 0,
    state          INTEGER NOT NULL DEFAULT 0,
    last_review    TEXT
);

CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(deck_id, due);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(deck_id, state);
CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source_id);

CREATE TABLE IF NOT EXISTS review_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    rating       INTEGER NOT NULL,
    state        INTEGER NOT NULL,
    due          TEXT NOT NULL,
    stability    REAL NOT NULL,
    difficulty   REAL NOT NULL,
    elapsed_days INTEGER NOT NULL,
    last_elapsed_days INTEGER NOT NULL,
    scheduled_days INTEGER NOT NULL,
    reviewed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_logs_day ON review_logs(reviewed_at);

CREATE TABLE IF NOT EXISTS user_progress (
    id     INTEGER PRIMARY KEY CHECK (id = 1),
    xp     INTEGER NOT NULL DEFAULT 0,
    level  INTEGER NOT NULL DEFAULT 0,
    theme  TEXT NOT NULL DEFAULT 'red'
             CHECK (theme IN ('red','green','blue','yellow'))
);

INSERT OR IGNORE INTO user_progress (id, xp, level, theme) VALUES (1, 0, 0, 'red');

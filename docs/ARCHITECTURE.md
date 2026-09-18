# Architecture

Deep-dive into the project's layers, decisions, data model, and known gotchas.
For a quick overview and setup instructions see the [README](../README.md).

---

## 1. Stack Choices

| Layer | Choice | Why |
|---|---|---|
| Desktop shell | **Tauri v2** (Rust) | ~3 MB installer (vs ~150 MB Electron), native window. Almost no Rust code needed. |
| UI | **React 19 + TypeScript + Vite** | Largest ecosystem, familiar language. |
| Styles | **Tailwind v4** | Fast iteration, theme via CSS variables. |
| Animations | **Motion** (`motion/react`) | Entry animations for modals and cards. |
| SRS | **`ts-fsrs`** | FSRS algorithm — modern successor to SM-2 (used by Anki). |
| DB (desktop) | **SQLite** (`@tauri-apps/plugin-sql`) | Persistent local data. |
| DB (web / dev) | **localStorage** | Browser development without Rust. |
| UI state | **Zustand** | Minimal, no boilerplate. |

The project was rewritten from a Flet (Python) version due to: niche framework,
constant breaking changes, poor SRS support, poor animations, screen-dimming bug.
All pain points were framework-level — hence a rewrite, not an extension.

---

## 2. Layers and Data Flow

```
┌──────────────────────────────────────────────────────────┐
│  UI (React) — features/*, components/*, App.tsx          │
│      │  reads/writes exclusively via getStore()          │
│      ▼                                                   │
│  Store (interface) — data/store.ts                       │
│      ├── SqliteStore (Tauri / desktop)                   │
│      └── WebStore   (browser)                            │
│      │  selected by environment: data/index.ts (isTauri) │
│      ▼                                                   │
│  Domain / SRS — domain/models.ts, domain/srs.ts (FSRS)  │
└──────────────────────────────────────────────────────────┘

AI:  UI → features/ai/analyzeClient.ts → (mock | POST /analyze/cards) → CardInput[]
     file import → features/ai/importFile.ts (batches of 5) → CandidateReview
```

**Core principle:** The UI never reaches into a specific database — only the `Store`
interface via `getStore()`. All FSRS logic lives in `domain/srs.ts`. The Store handles
persistence only.

---

## 3. Key Architectural Decisions

1. **Two backends behind one `Store` interface.** `SqliteStore` (production / desktop)
   and `WebStore` (dev / web). The app runs in a browser without Rust, and UI code
   stays identical. Selection: `data/index.ts` → `isTauri()` (checks
   `window.__TAURI_INTERNALS__`).

2. **FSRS as engine, "learned" status as derived.** Status is never stored — it's
   computed from FSRS state: `learnedStatusFromState(state)` (New → not_learned,
   Learning/Relearning → partial, Review → learned). See `domain/models.ts`.

3. **`CardInput` as shared contract.** The same type connects: card editor, file
   import, and `/analyze/cards` endpoint. This prevents the AI backend and the app
   from diverging structurally.

4. **`source_id` as a seam to the knowledge graph (Neo4j / JapaneseRag).** A card
   can point to a graph node — a pointer, not a duplication. FSRS state stays in
   SQLite; language knowledge stays in the graph (polyglot persistence).

5. **AI is a REST endpoint (not MCP, for now).** The app calls `POST /analyze/cards`.
   MCP is planned for when card authoring needs to happen outside the app (agent
   proposes → `pending_cards` inbox).

6. **LLM output is sanitized before saving.** SQLite had `CHECK` constraints —
   out-of-enum values broke inserts. `normalizeCard` clamps values to allowed sets.
   (See [Gotchas](#7-gotchas).)

---

## 4. Directory Structure

```
src/
├── domain/
│   ├── models.ts       # Card, Deck, CardInput, Example, types, learnedStatusFromState()
│   └── srs.ts          # FSRS: gradeCard(), previewIntervals(), emptyFsrsSnapshot()
├── data/
│   ├── store.ts        # Store interface + types (FsrsSnapshot, ReviewLog, Progress, HeatmapDay)
│   ├── index.ts        # getStore() — selects backend
│   ├── sqliteStore.ts  # SQLite implementation (Tauri)
│   ├── webStore.ts     # localStorage implementation (web)
│   └── schema.sql      # SQLite schema (single source of truth)
├── lib/
│   ├── xp.ts           # levelForXp(), XP_PER_REVIEW
│   ├── theme.ts        # ThemeName, ACCENTS, applyTheme()
│   └── config.ts       # getAnalyzeUrl() / setAnalyzeUrl()
├── store/
│   └── useAppStore.ts  # Zustand: navigation + progress + theme
├── components/         # Button, Modal, ConfirmDialog, StatusBadge, TagInput, ErrorBoundary
├── features/
│   ├── decks/          # DecksView, DeckDetailView, CardEditor, CandidateReview
│   ├── study/          # StudyView (FSRS session)
│   ├── stats/          # StatsView, Heatmap
│   ├── settings/       # SettingsView (theme + backend URL)
│   └── ai/             # analyzeClient.ts, importFile.ts
├── App.tsx             # Layout: Sidebar + view routing
└── main.tsx            # React bootstrap + ErrorBoundary

src-tauri/              # Tauri shell: lib.rs, tauri.conf.json, capabilities, Cargo.toml
```

---

## 5. Data Model (`domain/models.ts`)

**Card** — full card (from DB): content fields (`front`, `back`, `furigana`,
`reading`, `onyomi` / `kunyomi`), `cardType`
(`vocabulary | phrase | kanji | grammar | onomatopoeia`), `jlpt` (N5–N1),
`register` (`casual / formal / literary / neutral`), `usageNote`, lists of
`meanings` / `examples` / `synonyms`, `sourceId` (graph pointer), and FSRS state
(`due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `lastReview`, …).

**CardInput** — creation contract (subset without `id` / FSRS state). Used by
the editor, file import, and AI backend. Note: `card_type` and example fields use
snake_case to map 1:1 with pydantic on the backend side.

**Example** — `{ text, reading?, translation? }`.

**learnedStatusFromState(state)** — maps FSRS state to a UI label (not persisted).

---

## 6. Store Layer (`data/`)

The `Store` interface (`data/store.ts`) exposes everything the UI needs:
- Decks: `listDecks`, `getDeck`, `createDeck`, `renameDeck`, `deleteDeck`
- Cards: `getCards`, `getCard`, `getDueCards`, `getRandomCard`, `insertCard`,
  `updateCard`, `deleteCard`
- Review: `saveReview(cardId, snapshot, log, correct)` — saves FSRS state + log
- Progress: `getProgress`, `setTheme`, `addXp`
- Stats: `getHeatmap(days)`

Both implementations maintain identical semantics. `SqliteStore` serializes list
fields as JSON in TEXT columns; `WebStore` keeps them as JS objects. `updateCard`
in both implementations does **not** touch `source_id` or FSRS state (content
edits preserve them).

---

## 7. Gotchas

1. **AnimatePresence (Motion + React 19) freezes exit animations** — modal doesn't
   disappear, invisible overlay blocks clicks. Fix: `Modal` mounts conditionally
   (without AnimatePresence), entry animation only. Do not reintroduce
   AnimatePresence for modals.

2. **SQL permissions in Tauri.** `sql:default` does NOT include execute/select →
   blank window / infinite "Loading…". `capabilities/default.json` must have
   `sql:allow-load/execute/select/close`.

3. **CORS in desktop.** The installed app uses origin `http://tauri.localhost` (not
   `localhost:1420`). The backend needs this origin in CORS **and**
   `allow_methods=["*"]` (Starlette defaults to GET only → preflight POST returns
   400). The native Tauri HTTP plugin bypasses CORS entirely.

4. **SQLite CHECK constraints dropped cards during import (5 → 3).** LLM sometimes
   returned `jlpt:""` or invalid `card_type` → INSERT threw → the insert loop broke.
   Fix: (a) sanitization in `normalizeCard` + resilient loop, (b) CHECK constraints
   **removed** from the schema — validation is app-side. Adding a new card type
   (e.g. `onomatopoeia`) no longer requires a schema change. Migration:
   `sqliteStore.migrateDropChecks` (table rebuild, since SQLite can't ALTER CHECKs).

5. **Date comparison as strings in SQLite.** `getDueCards` compared
   `due <= datetime('now')` as strings. ISO dates (`…T…Z`) vs SQLite's
   `YYYY-MM-DD HH:MM:SS` format caused `T`(84) > space(32), filtering out due
   cards. Fix: `datetime(due) <= datetime('now')` (normalize both sides).

6. **Debugging the native Tauri window.** Browser DevTools don't control the Tauri
   webview. Workaround: set `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`
   and use CDP (`Runtime.evaluate`).

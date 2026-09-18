<div align="center">

# 日本語暗記 · NihongoCards

**Personal desktop flashcard app for Japanese** — with real spaced repetition
(**FSRS**) and optional AI-powered card generation.

Built with **Tauri v2 + React + TypeScript**.

![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![FSRS](https://img.shields.io/badge/SRS-ts--fsrs-5b5bd6)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)

</div>

---

## Overview

A personal Japanese vocabulary trainer that uses the **FSRS** algorithm (a modern
successor to Anki's SM-2) to schedule each card exactly when you're about to
forget it — instead of a simple "know / don't know" toggle.

A card is more than front/back — it holds furigana, on/kun readings, JLPT level,
register, usage notes, multiple meanings, example sentences, and synonyms.
Cards can be created manually **or generated via AI** (single word or bulk
file import), with full preview and editing before saving.

## Features

- 🗂️ **Decks** — full CRUD with card count and inline editor.
- 🧠 **Study (FSRS)** — review session with card reveal, Again / Hard / Good / Easy
  ratings showing real intervals, keyboard shortcuts (`Space` + `1–4`), progress bar,
  and session summary.
- 🏷️ **Card types** — `vocabulary · phrase · kanji · grammar · onomatopoeia`.
- 📊 **Statistics** — GitHub-style activity heatmap, XP / level system, day streaks.
- 🤖 **AI (optional)** — single-word field and file import via the
  [JapaneseRag](#japaneserag-integration) backend. Falls back to a built-in mock
  when offline.
- 🎨 **Themes** — dark base with switchable accent: **Red** (default) / Green / Blue /
  Yellow.
- 🔌 **Derived "learned" status** — `not learned / partial / learned` is computed from
  FSRS state, never set manually.
- 📴 **Works fully offline** — data stored locally in SQLite; AI degrades gracefully
  when the backend is unavailable.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | **Tauri v2** (Rust) — installer ≈ 3 MB |
| UI | **React 19 + TypeScript + Vite 6** |
| Styles | **Tailwind CSS v4** |
| Animations | **Motion** (`motion/react`) |
| SRS engine | **`ts-fsrs`** |
| Database (desktop) | **SQLite** via `@tauri-apps/plugin-sql` (WAL mode) |
| Database (web / dev) | **localStorage** (no Rust required) |
| HTTP for AI | **`@tauri-apps/plugin-http`** (native — bypasses CORS) |
| UI state | **Zustand** |

## Quick Start

```bash
npm install
npm run app:dev      # desktop window (Tauri + SQLite) — requires Rust
npm run app:build    # production installer (NSIS + MSI)
```

Frontend-only preview in the browser (no Rust needed, uses localStorage):

```bash
npm run dev
```

**Desktop requirements:** Node.js, Rust / Cargo, MS C++ Build Tools, WebView2
(pre-installed on Windows 10/11).

Installers output to `src-tauri/target/release/bundle/{nsis,msi}/`.
User data: `%AppData%\com.nihongocards.app\nihongo.db` (persists across reinstalls).

> ⚠️ Do not change the `identifier` in `tauri.conf.json` — it determines the
> database path.

## Architecture

The UI never touches a specific database — it talks exclusively to the `Store`
interface, and all scheduling logic lives in `domain/srs.ts`.

```
UI (React)
   │  via getStore()
   ▼
Store ── SqliteStore (desktop) │ WebStore (browser)
   │     selected by environment (isTauri)
   ▼
Domain / SRS (FSRS)

AI:  UI → analyzeClient → (mock | POST /analyze/cards) → CardInput[]
```

```
src/
├── domain/     # models + SRS (ts-fsrs)
├── data/       # Store interface, SqliteStore, WebStore, schema.sql
├── features/   # decks / study / stats / settings / ai
├── components/ # shared UI (Modal, Button, …)
├── store/      # Zustand (navigation, progress, theme)
└── lib/        # theme, xp, config, http
src-tauri/      # Tauri shell (Rust config, permissions)
```

📖 Full architecture deep-dive: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## JapaneseRag Integration

**JapaneseRag** is a separate backend (FastAPI + Neo4j + embeddings) that generates
and enriches cards. The coupling is intentionally loose:

- **Graph (Neo4j)** stores language knowledge. **SQLite** stores your learning state.
  A card is a denormalized snapshot with an optional `source_id` pointer — not a copy
  of the graph.
- Contract via REST (`POST /analyze/cards`) — the app **does not depend** on the graph.
  Without the backend you simply create cards manually.
- API contract: [`docs/analyze-word-contract.md`](docs/analyze-word-contract.md)

The backend URL is configured in **Settings** (stored locally, independent of the
database).

## Roadmap

Sentence mining, corpus examples via semantic search, "i+1 sentences" endpoint
powered by known words (FSRS state), graph write-back via `MERGE`. Details:
[`docs/ROADMAP.md`](docs/ROADMAP.md).

---

<div align="center">
<sub>Personal project · learning Japanese 🇯🇵</sub>
</div>

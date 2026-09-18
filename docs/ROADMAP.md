# Roadmap

The core app is complete. Below are planned integrations with JapaneseRag and
future ideas, roughly ordered by value / effort.

## JapaneseRag Integration

- [ ] **Sentence mining** — "from sentence" input in the app → `POST /analyze`
      (existing endpoint) → split into words + translate → user selects words →
      cards via `/analyze/cards` → existing `CandidateReview` flow. Highest
      priority; reuses existing endpoint.
- [ ] **Corpus examples** — semantic search (existing) by word → best sentences
      as `card.examples` (alongside or instead of LLM-generated ones).
- [ ] **"What to learn next"** — app sends known words; a stats endpoint returns
      frequent words outside that set → add with one click.
- [ ] **Write-back to graph (get-or-create)** — `MERGE (:Word {lemma})`,
      `source_id` in response; already wired in the app as a seam. Enable once
      the graph schema stabilizes.

## Backend Expansion (JapaneseRag side)

- [ ] Richer knowledge graph relations (collocations, synonyms, kanji ↔ words, i+1).
- [ ] **"i+1 sentences" endpoint** — powered by the app's known words (FSRS state).
      Flagship feature bridging both projects; optionally ranked via embeddings.
- [ ] Static JLPT list + frequency on Word nodes (no LLM needed).
- [ ] **MCP server** (local LLM) — agent proposes cards → `pending_cards` inbox
      for user approval in the app.

## App Polish

- [ ] Desktop build (Tauri) + app icons.
- [ ] UX refinements based on real usage.

> **Note:** The JapaneseRag knowledge graph is under active development and may
> be reset — that's why the app intentionally does **not** depend on it (contract
> via endpoints + `source_id`).

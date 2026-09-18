# API Contract: `/analyze/cards`

The analysis endpoint lives in **JapaneseRag** (where the LLM key is).
NihongoCards calls it from the deck view ("Add via AI"). The endpoint is
**batch-capable**: the `text` input (single word or multi-word payload) returns
an **array** of cards. Saving to the database is done by the app.

Backend URL is configured in **Settings → AI backend URL** (empty = demo / mock
mode).

## Request

```http
POST /analyze/cards
Content-Type: application/json

{ "text": "図書館" }
```

## Response

```json
[
  {
    "front": "図書館",
    "back": "library",
    "furigana": "としょかん",
    "reading": "toshokan",
    "onyomi": "",
    "kunyomi": "",
    "card_type": "vocabulary",
    "jlpt": "N5",
    "register": "neutral",
    "usage_note": "",
    "meanings": ["library"],
    "examples": [
      {
        "sentence": "私は毎日図書館で勉強します。",
        "furigana": "わたしはまいにち…します。",
        "reading": "Watashi wa…",
        "translation": "I study at the library every day."
      }
    ],
    "synonyms": [],
    "source_id": null
  }
]
```

## Field Mapping (backend → app)

The app normalizes the response in `analyzeClient.ts`, so minor naming
differences are handled transparently:

| Backend field | App (`CardInput`) field | Notes |
|---|---|---|
| `examples[].sentence` | `examples[].text` | Renamed |
| `examples[].furigana` | `examples[].reading` | Kana preferred over romaji |
| `source_id` | `sourceId` | Optional graph pointer |
| All other fields | 1:1 | Direct mapping |

Missing fields are filled with safe defaults — a partial LLM response won't
break the preview.

## `source_id` — Knowledge Graph Seam

The response may include an optional `source_id` (Neo4j node ID). The app
persists it on the card (`Card.sourceId`) without duplicating the graph. It's a
pointer to the system-of-record for future features ("related words", content
refresh).

Recommended backend flow (get-or-create via `MERGE`):

```cypher
MERGE (w:Word {lemma: $lemma})
ON CREATE SET w.created = timestamp()
RETURN w
```

- **New node** → LLM generates content, store nodes/relations in graph.
- **Existing node** → read from graph (no LLM call: cheaper, consistent).
- In both cases return `source_id` = node ID.

In pydantic: `source_id: Optional[str] = None`.

## Prompt Notes

- `onyomi` / `kunyomi` are typically relevant only for `card_type == "kanji"`
  (single character). For compound words, instruct the model to leave them empty.
- `register` (`casual | formal | literary | neutral`) — missing or invalid values
  are saved as NULL.
- `usage_note` — request the model to populate this **only** when the word has a
  notable nuance, and to skip it for kanji cards to keep token usage low.

## Future: MCP

An MCP server in JapaneseRag will wrap this same function as a tool. Per the
"agent proposes" pattern, it will write proposals to a `pending_cards` inbox that
the app surfaces for user approval.

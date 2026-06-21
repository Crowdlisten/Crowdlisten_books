# Answer with Books

Open-source REST API and agent skill for answering recurring questions with books.

Answer with Books treats internet questions as demand and books as source material. It lets agents and applications retrieve similar answered questions, retrieve relevant books, and generate a new book-grounded answer only when the cache does not already have one.

## What It Does

- Stores a lightweight book source graph: concepts, quotes, frameworks, stories, and applications.
- Stores generated answers as a reusable cache.
- Retrieves similar answered questions before generating anything new.
- Retrieves relevant books for a question, and can add a missing book to the catalog.
- Accepts demand signals from CrowdListen, top-of-mind user input, and clicked questions.
- Lets clients toggle which sources are active for retrieval and generation.
- Ships an agent skill so Codex, Claude Code, Cursor, or other agents can use the API consistently.

## Product Loop

```text
books -> source graph
CrowdListen + clicked questions + top-of-mind topics -> demand graph
question -> retrieve similar generated answers
miss -> retrieve relevant books -> generate answer -> cache it
generated answers -> user reading, saves, clicks, and follow-up questions
```

This is not a generic content machine. The point is to help people learn from books by connecting durable ideas to the questions they already care about.

## Quick Start

```bash
npm install
npm run dev
```

The API runs at:

```text
http://127.0.0.1:8787
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

## Example

Submit a top-of-mind demand signal:

```bash
curl -X POST http://127.0.0.1:8787/v1/signals/top-of-mind \
  -H 'content-type: application/json' \
  -d '{"items":["How do I know whether my startup idea is actually good?"]}'
```

Ask a question through the cache-first answer endpoint:

```bash
curl -X POST http://127.0.0.1:8787/v1/answers/query \
  -H 'content-type: application/json' \
  -d '{
    "question": "How do I know if my startup idea is any good?",
    "sources": ["books", "top_of_mind", "clicked_questions", "crowdlisten"],
    "format": "article",
    "audience": "early-stage founder"
  }'
```

Retrieve books for a question:

```bash
curl -X POST http://127.0.0.1:8787/v1/books/retrieve \
  -H 'content-type: application/json' \
  -d '{"query":"customer discovery and startup validation"}'
```

Add a missing book when the catalog has no good match:

```bash
curl -X POST http://127.0.0.1:8787/v1/books/retrieve \
  -H 'content-type: application/json' \
  -d '{
    "query": "strategy kernels and diagnosis",
    "create_if_missing": true,
    "book": {
      "title": "Good Strategy Bad Strategy",
      "author": "Richard Rumelt",
      "concepts": ["diagnosis", "guiding policy", "coherent action"],
      "applications": ["strategy", "planning"]
    }
  }'
```

Generate a book-grounded answer directly:

```bash
curl -X POST http://127.0.0.1:8787/v1/content/generate \
  -H 'content-type: application/json' \
  -d '{
    "question": "How do I know if my startup idea is any good?",
    "sources": ["books", "top_of_mind", "clicked_questions", "crowdlisten"],
    "format": "article",
    "audience": "early-stage founder"
  }'
```

Toggle sources globally:

```bash
curl -X POST http://127.0.0.1:8787/v1/sources/toggle \
  -H 'content-type: application/json' \
  -d '{"enabled":["books","clicked_questions"]}'
```

## REST Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health |
| `GET` | `/v1/sources` | List source toggles |
| `POST` | `/v1/sources/toggle` | Enable selected sources |
| `GET` | `/v1/books` | List book source records |
| `POST` | `/v1/books` | Add a book source record |
| `POST` | `/v1/books/retrieve` | Retrieve relevant books or create a missing catalog record |
| `GET` | `/v1/questions` | List captured questions |
| `POST` | `/v1/questions` | Capture a user question |
| `POST` | `/v1/signals/top-of-mind` | Add explicit user demand signals |
| `POST` | `/v1/signals/clicked-question` | Add clicked-question demand signal |
| `POST` | `/v1/crowdlisten/sync` | Ingest CrowdListen-derived demand signals |
| `GET` | `/v1/content` | List generated drafts |
| `POST` | `/v1/content/generate` | Generate a book-grounded content draft |
| `POST` | `/v1/answers/query` | Retrieve similar answers, or generate and cache on miss |

See [`docs/openapi.yaml`](docs/openapi.yaml) for the API contract.

## Agent Skill

The skill lives at:

```text
skill/answer-with-books/SKILL.md
```

It teaches an agent to:

1. Identify the user's question or top-of-mind topic.
2. Retrieve similar generated answers first.
3. Retrieve relevant books from the catalog.
4. Add missing books when no preindexed source exists.
5. Generate a new book-grounded answer only on a cache miss.
6. Keep the output grounded in source books rather than generic summaries.

## CrowdListen Integration

The current repo exposes the integration seam through:

```text
POST /v1/crowdlisten/sync
```

CrowdListen can send trending questions, pain points, themes, or emotional language into this API as demand signals. This keeps CrowdListen responsible for "what people care about now" and Answer with Books responsible for "which book-grounded answer should exist."

## Development

```bash
npm test
npm run check
```

The first implementation is intentionally dependency-light and in-memory. Production adapters should add durable storage, auth, rate limits, model providers, and a real CrowdListen client.

## License

MIT

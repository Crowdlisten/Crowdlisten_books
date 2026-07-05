# 锦囊妙计 - Answer with Books

![Watercolor illustration of a sealed strategy pouch, books, and an agent harness](docs/assets/jinnang-miaoji-watercolor.jpg)

**Helping answer your top of minds with insights from books.**

Answer with Books gives your agent harness a shelf of useful book-derived judgment. When you ask a messy question, the agent can look for the closest existing answer, pull the right book lenses, and return a practical next move instead of generic advice.

The metaphor is **锦囊妙计**: in *Romance of the Three Kingdoms*, Zhuge Liang gives Zhao Yun sealed pouches with strategies to open at the right moment. This project is the same idea for agents: a small packet of book-grounded insight, opened when the question actually matters.

## Install

Install the agent skill and local API config:

```bash
npx answer-with-books install --skill --api
```

Run the local API:

```bash
npm install
npm run build:book-corpus
npm run dev
```

The local API starts at:

```text
http://127.0.0.1:8787
```

Quick health check:

```bash
curl http://127.0.0.1:8787/health
```

## What It Does

| Layer | What it gives your agent |
| --- | --- |
| Book shelf | Distilled ideas, frameworks, quotes, examples, and when-to-use notes from books |
| Question memory | A cache of answered questions so the agent reuses good answers before generating new ones |
| Demand signals | Top-of-mind questions, clicked questions, and CrowdListen demand packets |
| Retrieval | The closest prior answers and most relevant book lenses for the current question |
| Generation | A book-grounded answer only when the cache does not already have one |

## Use Cases

| Use case | Example question | Book-grounded output |
| --- | --- | --- |
| Founder judgment | "Am I validating this idea or just collecting compliments?" | Pulls from *The Mom Test* and related lenses to separate praise from evidence |
| Career decisions | "What should I do next without starting over?" | Uses career and design books to turn uncertainty into options and tests |
| Team decisions | "Why are smart people making a bad group decision?" | Applies group judgment frameworks and process checks |
| Productivity | "How do I keep the habit alive during a chaotic week?" | Converts habit and time-management ideas into a smaller next move |
| Product strategy | "Is this a real signal or just noisy feedback?" | Matches demand evidence to product and customer research books |
| Agent workflows | "What context should my coding or research agent use here?" | Retrieves the relevant shelf context before the agent acts |

## How Agents Use It

The installed skill teaches an agent to:

1. Understand the user's top-of-mind question.
2. Check whether a strong answer already exists.
3. Retrieve the books that are useful for that situation.
4. Add a missing book when the catalog has no good match.
5. Generate a grounded answer and save it back for reuse.

The skill lives at:

```text
skill/answer-with-books/SKILL.md
```

## CrowdListen Loop

CrowdListen supplies demand: repeated questions, objections, and debates people keep having online. Answer with Books turns that demand into book-grounded answers and expands the shelf when new questions reveal missing books.

```text
CrowdListen demand -> book lenses -> answer -> reading behavior -> better demand
```

## API Reference

The README is intentionally simple. For the full API contract, see:

```text
docs/openapi.yaml
```

Core endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/answers/query` | Retrieve a similar answer or generate one on cache miss |
| `POST /v1/books/retrieve` | Find relevant books or add a missing catalog record |
| `POST /v1/signals/top-of-mind` | Add user top-of-mind questions |
| `POST /v1/crowdlisten/sync` | Import CrowdListen demand packets |

## Development

```bash
npm test
npm run check
npm run test:skill
```

## License

MIT

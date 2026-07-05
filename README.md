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
npm run build:retrieval-corpus
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

Ask the installed shelf:

```bash
answer-with-books ask "Am I validating this idea or just collecting compliments?"
```

Add personal top-of-mind context when you want the answer tuned to what you are
already thinking about:

```bash
answer-with-books ask "What should I do next?" \
  --top-of-mind "launching a content engine, validating founder demand"
```

## What It Does

| Layer | What it gives your agent |
| --- | --- |
| Books | Distilled ideas, frameworks, quotes, examples, and when-to-use notes from the source shelf |
| Answers | Published answer pages retrieved before generating anything new |
| New questions | Questions captured when the shelf has no strong existing answer yet |
| Thin harness | One command or endpoint: `answer-with-books ask` / `POST /v1/ask` |

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
2. Retrieve existing published answers.
3. Retrieve useful source books.
4. Capture the question as new when no answer is close enough.
5. Adapt the retrieved material to the user's exact situation.

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
| `POST /v1/ask` | Retrieve published answers and books, or capture a new question |
| `POST /v1/answers/query` | Legacy cache-first answer retrieval/generation |
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

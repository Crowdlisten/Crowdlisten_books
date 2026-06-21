# Architecture

Answer with Books has four small layers.

## 1. Source Graph

The source graph stores book records:

- title and author
- concepts
- quotes
- applications
- future: stories, chapters, citation spans, licensed excerpts, embeddings

Books are the durable source material. The API should never generate unsupported claims or pretend a quote exists when it does not.

## 2. Demand Graph

The demand graph stores signals:

- CrowdListen themes and questions
- top-of-mind user topics
- clicked questions
- saved or expanded questions

Demand signals decide what content is worth generating. They do not replace the books.

## 3. Answer Generator

The generator selects relevant books, combines them with active demand signals, and creates a draft artifact. It should run after retrieval fails to find a useful cached answer.

Supported draft formats:

- `article`
- `brief`
- `script`
- `card`

The first implementation is deterministic and dependency-light. Production implementations can replace `src/generator.js` with an LLM-backed adapter while keeping the REST contract stable.

## 4. Answer Cache

Generated answers are stored as reusable artifacts. When a new question arrives, the API should:

1. retrieve similar generated answers
2. retrieve relevant source books
3. return the cached answer if similarity is good enough
4. generate a new answer only on a miss
5. store the generated answer for future retrieval

This keeps the system from repeatedly generating near-duplicate answers and lets users discover prior explanations for related questions.

## Future Production Adapters

- Postgres or Supabase persistence
- pgvector search over book fragments
- CrowdListen REST/MCP client
- OpenAI Responses API content generator
- auth and rate limits
- review queue for generated drafts
- citation/span enforcement

# Answer with Books

Give your agent a book’s methods, grounded in public editorial digests and source references. The website also turns your own uploaded source into a private book and skill package.

## One install path

Node 20+ is required. Use the pinned npm release below; older npm 0.1.0 installations lack the runtime and ask command. From any empty directory:

```sh
npx --yes answer-with-books@0.1.4 install --skill --api
npx --yes answer-with-books@0.1.4 ask "Am I validating this idea or collecting compliments?" --json
```

No repository clone, npm install, account, API key, or running server is required to ask. The command retrieves from the bundled corpus in-process. The agent skill is installed to `$CODEX_HOME/skills/answer-with-books` (default `~/.codex/skills/answer-with-books`) together with its executable source and corpus. An existing installation at that path is updated. `npx` does not install a global command; keep the `npx` prefix, or use the bundled Node command documented in SKILL.md.

`--api` installs a self-contained runtime at `.answer-with-books/runtime`. To run its optional local HTTP API:

```sh
node .answer-with-books/runtime/src/server.js
curl http://127.0.0.1:8787/health
```

Alternatively use `npx --yes answer-with-books@0.1.4 serve`. The server binds to localhost. `ask` uses the bundled corpus unless you explicitly pass `--api-url` or `ANSWER_WITH_BOOKS_API_URL`; an unavailable explicit server is an error, not a silent fallback.

## Retrieval contract

`POST /v1/ask` accepts `{"question":"How do I run customer interviews?","compact":true}`. It returns `objects.books`, `objects.answers`, and an unsaved `objects.new_question` on a miss. Only published editorial answers qualify. Both answers and books require multiple distinct relevant terms; full-text coincidence alone is insufficient. No template answer is generated. Scores are lexical matching scores, not confidence probabilities. The index supports English queries; agents can translate queries and disclose that step. A missing match is a coverage gap, not proof that no useful book exists.

`POST /v1/answers/query` is a compatibility alias for the same retrieval logic. It no longer generates or caches drafts. `/v1/content/generate` is retired. Requests have a 64 KB body limit and questions a 2,000-character limit. Malformed JSON and unknown source IDs return 400. Disabled book sources disable both book and published-answer retrieval.

## Privacy and operator APIs

Asking does not save raw questions or context. Operator routes (question queue, signals, source toggles, catalog edits, and CrowdListen imports) require `Authorization: Bearer <AWB_ADMIN_TOKEN>` and a server-configured token of at least 24 characters. Without a configured token they are unavailable. Explicit `capture: true` also requires authorization. This is one operator-owned store, not multi-user storage. Do not expose it as a public customer service without per-user authentication and isolation. Public catalog reads remain available. Binding beyond loopback requires the operator token.

Examples for an authorized operator:

```http
POST /v1/sources/toggle
{"enabled":["books","top_of_mind"]}

POST /v1/signals/top-of-mind
{"items":["Improve customer interviews"]}

POST /v1/ask
{"question":"A new research question","capture":true}
```

## Development

```sh
npm test
npm run check
npm run test:skill
npm run build:book-corpus
npm run build:retrieval-corpus
```

The corpus is already bundled. Build commands validate it when source Markdown is absent. To regenerate from the website repository, use `npm run build:book-corpus -- --input /path/to/web/src/content/books` and `npm run build:retrieval-corpus -- --input /path/to/web/src/content`. Do not rebuild from an assumed sibling checkout.

The upload-to-skill service is a separate website worker. It is not installed by this CLI and does not use the old research API keys.

MIT. See LICENSE.

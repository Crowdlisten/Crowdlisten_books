# Answer with Books

Give your agent a book’s methods, grounded in public editorial digests and source references. The website also turns your own uploaded source into a private book and skill package.

## One install path

Node 20+ is required. Use the versioned GitHub release below. The npm registry remains at 0.2.0 until publication authentication is completed; this release includes the 0.3.0 account library commands. From any empty directory:

```sh
npx --yes https://github.com/Crowdlisten/Crowdlisten_books/releases/download/v0.5.0/answer-with-books-0.5.0.tgz install --skill --api
npx --yes https://github.com/Crowdlisten/Crowdlisten_books/releases/download/v0.5.0/answer-with-books-0.5.0.tgz ask "Am I validating this idea or collecting compliments?" --json
```

No repository clone, npm install, account, API key, or running server is required to ask. The command retrieves from the bundled corpus in-process. The agent skill is installed to `$CODEX_HOME/skills/answer-with-books` (default `~/.codex/skills/answer-with-books`) together with its executable source and corpus. An existing installation at that path is updated. `npx` does not install a global command; keep the `npx` prefix, or use the bundled Node command documented in SKILL.md.

`--api` installs a self-contained runtime at `.answer-with-books/runtime`. To run its optional local HTTP API:

```sh
node .answer-with-books/runtime/src/server.js
curl http://127.0.0.1:8787/health
```

Alternatively use `npx --yes https://github.com/Crowdlisten/Crowdlisten_books/releases/download/v0.5.0/answer-with-books-0.5.0.tgz serve`. The server binds to localhost. `ask` uses the bundled corpus unless you explicitly pass `--api-url` or `ANSWER_WITH_BOOKS_API_URL`; an unavailable explicit server is an error, not a silent fallback.

## Commands

| Command | Purpose |
| --- | --- |
| `books [search] --json` | List the public shelf and, when signed in, your private books. `list` is an alias. |
| `ask "question" --json` | Retrieve public methods and citations for your agent. `answer` is an alias. |
| `ask "question" --book ID --json` | Focus on one public or private book. |
| `login` | Connect your account through browser sign-in and a terminal code. |
| `upload book.pdf notes.docx --json` | Process separate private books, skills, and covers in the background. |
| `status [ID] --json` | Check the private queue or one book. |
| `download ID --output book.zip` | Save the digest, skill, and cited source files. |
| `logout` | Revoke this agent's account access. |

`books --topic "customer research"` filters the catalog; `--public` and `--private` select a library. Public `ask` works offline. Private books are selected explicitly with `--book ID`; your agent can first browse `books --private` to choose one. Retrieval returns evidence, not an AI-generated answer.

The skill can activate from ordinary book mentions or a relevant practical question; special command syntax is optional. Explicit invocation remains `$answer-with-books` in Codex or `/answer-with-books` in Claude Code. These are actions within one skill, not universal slash commands.

## Semantic matching

Version 0.3.0 adds `match "QUESTION" --public --json`. Run it using `npx --yes https://github.com/Crowdlisten/Crowdlisten_books/releases/download/v0.5.0/answer-with-books-0.5.0.tgz match ...`, from this checkout, or from the installed skill runtime.

The flow is **semantic candidates → host-agent relevance judgment → selected book evidence → applied answer**. `match` uses a pinned multilingual E5 model locally, then returns a shortlist explicitly marked `needs_reasoning`. The agent chooses up to three sources by the user's intent, the relevant method, and its limits, reads each with `ask --book ID`, and can reject the entire shortlist. Cosine similarity is not confidence. The standalone matcher does not secretly call a second language model or pretend to have completed that reasoning.

The optional `@huggingface/transformers` dependency supplies local inference. First use downloads approximately 130 MB of model files from Hugging Face. Subsequent calls reuse the model and passage-vector cache under `~/.cache/answer-with-books` (override with `ANSWER_WITH_BOOKS_CACHE_DIR`). Query text is not saved. Book text, questions, and private-library metadata are not sent to an embedding service. Cached vectors include no raw passages, but still represent their content and should be treated as local private data.

`match --catalog` skips model inference and returns the complete ready-book catalog for agent reasoning. If the optional runtime/model is unavailable, the command explicitly returns the same catalog mode with a reason. Copied skill/API runtimes intentionally omit `node_modules`: install dependencies in their runtime directory with `npm install --omit=dev` to enable embeddings there, or use catalog reasoning. No model download occurs for `books` or legacy public `ask`.

The local HTTP equivalent is `POST /v1/books/match` with `{ "question": "...", "catalog_only": false }`. It validates input, respects disabled sources, and never saves questions. Legacy `/v1/ask` and `/v1/answers/query` retain the keyword contract below for compatibility; the revised skill starts with `match`, not those keyword endpoints.

For private books, `ask --book ID` ranks bounded chapter previews locally and includes a complete chapter index. The agent can read up to three explicitly selected references with `--chapters "skill/chapters/01.md,skill/chapters/02.md"`. This uses exact paths from the exported bundle, preserves citation line numbers and the review gate, and does not execute generated files. Without the embedding runtime, only the core/index is returned until the agent selects chapters; it does not silently fall back to keyword chapter ranking.

Run `node scripts/evaluate-semantic-retrieval.mjs` for the small real-model smoke comparison. See [the upstream trial and implementation report](docs/SEMANTIC_RETRIEVAL_TRIAL.md) for results and limitations.

## Account book skills and revisions

These commands require version 0.3.0 or a freshly installed runtime from this checkout. With the versioned release, replace `node bin/answer-with-books.js` below with `npx --yes https://github.com/Crowdlisten/Crowdlisten_books/releases/download/v0.5.0/answer-with-books-0.5.0.tgz`.

```sh
node bin/answer-with-books.js books --private --json
node bin/answer-with-books.js library install-book BOOK_ID --json
node bin/answer-with-books.js library sync --json
node bin/answer-with-books.js upload revised.pdf --book BOOK_ID --revision replace --mode analysis --extraction technical
node bin/answer-with-books.js status REVISION_ID --json
node bin/answer-with-books.js generate REVISION_ID --json
node bin/answer-with-books.js revisions BOOK_ID --json
node bin/answer-with-books.js activate REVISION_ID --accept-review
node bin/answer-with-books.js library install-book BOOK_ID
```

`install-book ID` aliases `library install-book ID`. IDs may be the stable `book_id` or current revision ID returned by the private catalog. Each book is one skill, including all chapter notes and citation sources. Only ready, current records marked `source_kind: full-source` are installable. The public editorial catalog remains available to the generic discovery skill; it is not presented as full-book source coverage.

The catalog includes the current revision, one-line argument, relevant situations, tags, and methods. Agents use those fields to select an applicable book and load only useful chapter references. The generic discovery skill remains installed separately.

Full source packages and private semantic indexes are cached under `~/.cache/answer-with-books/accounts/<account-hash>/` (or `ANSWER_WITH_BOOKS_CACHE_DIR`). An installed book lives at `$CODEX_HOME/skills/awb-<account-namespace>-<stable-book-id>/` as a managed link to a complete cached revision. Updates validate the export identity, all file hashes, source files, and review findings, then atomically switch that link. Prior cached revisions remain intact. Unmanaged paths, foreign links, path traversal, incomplete packages, and changed, missing, or extra installed files cause an error without replacing the previous revision. The installed entrypoint uses the stable folder name; its original generated version remains in `exported/skill/SKILL.md`.

`library sync` reports each book independently and exits unsuccessfully if any eligible installation fails. It does not remove old or other-account packages. Logout revokes remote access but does not erase previously downloaded local files; installed packages remain available offline. Only the currently connected account is listed or synced, and credentials are never stored in packages.

`upload --book ID --revision append|replace` creates a new revision with the selected current revision as parent; it never silently reuses an earlier source hash. Use one source per revision. `--mode analysis` stops after source analysis; `generate ID` continues full generation. `--mode full` is the default. `--extraction technical` and DRM-free Kindle formats (`.mobi`, `.azw`, `.azw3`) use native server extraction. Other formats with `--extraction text` use the staged local extraction path. No DRM removal is supported. `pause ID` and `retry ID` control processing. Unfinished native extraction retries go to the native worker; native extraction cannot currently be paused, and generation waits for it to complete. A ready child becomes current only after explicit `activate ID --accept-review`, provided its parent is still current; local installation is a separate operation.

Flagged exports also require `--accept-review` for download or installation. Review the returned findings before accepting them. Copied runtimes need their declared dependencies (`npm install --omit=dev` in the runtime directory) for local extraction, ZIP creation, or optional embeddings; account listing, native upload, and per-book installation do not need those dependencies. Revision commands never fall back to an older npm release.

Uploads support searchable PDF, EPUB, DOCX, HTML, RTF, Markdown, and text. Ten files per batch, each up to 50 MB; six million extracted characters per source. No Python install is needed. Exact saved sources are reused before extraction. A public title match offers the existing digest without uploading; use `--process-file` only to process that specific file instead. Failed files do not stop successful ones. New sources are sent to the generation provider; originals and artifacts remain private to your account.

Browser connection authorizes a revocable 30-day book-only session, stored outside your project in a private local file. No password, Supabase admin key, or provider key is required in the terminal. `download` does not overwrite files and preserves the service's review gate for flagged content (`--accept-review` only after reviewing findings).

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

Uploads use the existing hosted processing worker. The CLI bundles source extraction and connects to the worker through your authorized book session. It does not use the retired research API keys.

MIT. See LICENSE.

## Hosted private-library search (0.5.0)

The development runtime adds `search "YOUR QUESTION" --json`, `match --private`, and `ask --private [--book ID]`. One local Answer With Books guide retrieves a small set of chapter methods and exact citations from the connected account's current ready books. Individual installed book skills remain optional; a library question does not require downloading or installing every book. Your agent checks applicability and writes the answer.

Version 0.5.0 connects to the companion `book-library` backend. Older clients can use local `match`, then `ask --book ID`. Hosted private retrieval sends the query to the embedding provider; the service does not save questions. Public `match` retains its local embedding behavior. An unavailable or expired private endpoint is reported explicitly. See the [backend architecture, benchmark, and rollout notes](https://github.com/terrylinhaochen/answerwithbooks/blob/codex/book-pipeline-quality/docs/HOSTED_BOOK_LIBRARY.md).


Files, directories and quoted globs can be uploaded: `upload "./reading/**/*.epub" --process-file`. They become separate books. Add `--combine "Research collection"` only for an intentional collection with preserved originals and explicit source boundaries (up to ten sources, 50 MB combined). Local Python speeds up the same pinned extraction logic when available; no Python installation is required because the WebAssembly fallback remains bundled.

Generation uses saved targeted review repairs. Covers run separately: `retry-cover ID` cannot regenerate the text package. `usage ID --json` reports recorded provider estimates and unpriced calls; customer charges are not configured by this CLI.

## Choose a generation route

Existing public digests and your completed private results remain free to reuse. For a new book, let your own agent create a local package with no Answer with Books generation charge, or upload it for metered hosted generation within an approved spending limit. Private books stay private.

```sh
answer-with-books local prepare ./book.pdf --output ./my-book
answer-with-books local next ./my-book
# Your agent writes a response matching the returned JSON schema.
answer-with-books local respond ./my-book --input ./response.json --request REQUEST_ID
# Repeat next/respond until ready, then optionally install:
answer-with-books local install ./my-book
```

The current agent supplies both generation and source review through its own plan. Progress is saved, repair findings preserve accepted notes, and no login or AWB model API is used. A complete package contains the readable book, skill, chapter notes, glossary, patterns, cheatsheet, and citation source. This route does not create a hosted library entry or AI cover. First use may download the local extractor runtime; scanned sources need OCR first.

Hosted intake saves the source before generation. Use `quote BOOK_ID --ceiling-cents MAX_CENTS --json`, show the returned maximum additional spend and customer token rates, and obtain explicit acceptance. Then run `accept-price BOOK_ID --quote QUOTE_ID --ceiling-cents EXACT_CENTS`. The ceiling is not a fixed price or a completion estimate. Generation, reviews, repairs and covers count toward actual usage; consumed usage is charged even on failure or cancellation. Unused funds are released. `usage` shows durable operation receipts and actual settlement. Missing receipts require reconciliation rather than a guessed charge. A new limit requires fresh acceptance. Existing results and own-agent generation remain free from AWB. This CLI does not enable production charging.

See [the agent workflow](skill/answer-with-books/references/processing-routes.md).

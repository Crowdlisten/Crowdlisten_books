# Knowledge Engineering Loop

Answer with Books should stay simple: use CrowdListen to find demand, use books to supply durable source material, and publish short guides only when the book corpus makes the answer better than generic advice.

## Data Flow

```text
CrowdListen research -> demand packets -> concern seeds -> answer briefs -> book retrieval -> Markdown guide
```

The public site only needs polished guides. The research layer keeps the evidence trail.

## Objects

### CrowdListen evidence

Raw posts, comments, source pages, or synthesized insights collected by CrowdListen's research loop from Reddit, YouTube, Hacker News, forums, search results, and other public sources.

Keep:

- platform and URL,
- title or short excerpt,
- date when available,
- engagement counts,
- discovered query,
- subreddit/channel/community.

### Demand packet

A CrowdListen export object that summarizes a topic people repeatedly care about. It should preserve the evidence trail while giving Answer with Books enough structure to match the demand to books.

It should answer:

- What are people trying to do?
- What pain or confusion blocks them?
- Who is the likely audience?
- Which books can answer this better than generic advice?
- Is the concern ready for drafting, in need of source review, or on hold?

### Concern seed

A reusable demand object produced either by CrowdListen sync or by the local development fallback in `scripts/enrich-demand-concerns.mjs`.

### Answer brief

The generation contract. It says how to turn the concern into a guide without making it a book report.

Each brief should include:

- how-to title,
- target audience,
- social evidence examples,
- source books and their role,
- answer shape,
- quality bar.

### Book corpus

The current corpus is curated book notes in `web/src/content/books/` plus seed book metadata in `src/store.js`.

This is enough for:

- choosing book lenses,
- drafting applied explanations,
- building checklists,
- linking guide pages back to book pages.

It is not enough for:

- unverified exact quotes,
- claims about page numbers,
- dense scholarly interpretation,
- saying the answer fully represents the book.

When PDFs are added, the corpus should add:

- extracted chunks by book and section,
- quote ledger with location metadata,
- concept cards,
- retrieval traces attached to each generated brief.

## Generation Rules

1. Start with the user's concern, not the book.
2. Use one book as the primary mechanism.
3. Use a second book only when it adds a correction, constraint, or operating method.
4. Include a practical checklist or decision rule.
5. Keep social evidence in research artifacts, not as noisy diagnostics on the public page.
6. Publish exact quotes only from verified notes, PDFs, or a quote ledger.
7. Mark weak concerns as `hold`; do not generate content just because a cluster exists.

## Current Commands

Use CrowdListen for production demand discovery and sync its export into the API:

```bash
npm run sync:crowdlisten -- --input path/to/crowdlisten-demand.json
```

Local Reddit discovery is a fixture path for development only:

```bash
npm run discover:reddit -- --after 2024-01-01 --limit 25
npm run discover:reddit -- --cluster prioritize-without-loudest-voice --limit 8 --delay-ms 1600
npm run enrich:concerns
```

Outputs:

- `research/crowdlisten-sync-result.json`
- `research/reddit-question-discovery.json`
- `research/concern-seeds.json`
- `research/answer-briefs.json`

## API Loop

The core API can ingest enriched concerns:

```http
POST /v1/concerns/sync
```

It can also ingest the fuller CrowdListen export directly:

```http
POST /v1/crowdlisten/sync
```

Then generate a draft:

```http
POST /v1/content/generate
{
  "concern_id": "prioritize-without-loudest-voice",
  "sources": ["books", "crowdlisten"]
}
```

The concern's matched books become preferred book lenses for generation.

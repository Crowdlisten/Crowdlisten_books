# Answer with Books Question Discovery Plan

## Goal

Use CrowdListen-style demand discovery to find real questions people are already asking, then answer them with books in short, useful, source-grounded guides.

The content job should stay simple:

1. Discover repeated user confusion, frustration, or decision pressure.
2. Pick the book lenses that actually help.
3. Write a short how-to answer with specific book ideas and short quotes where available.
4. Publish only when the answer is more useful than a generic LLM response.

## First Slice

The first validated slice uses Reddit because it has the best existing local support:

- `knowledge/research/workflow_discovery/collect_workflow_evidence.py` already proves the Arctic Shift + local scoring pattern.
- `core/scripts/discover-reddit-questions.mjs` adapts that pattern for book-answer demand discovery.
- `core/research/reddit-question-discovery.json` stores the evidence trail.

The first catalog guides are:

- How to validate an idea without fooling yourself
- How to run user interviews that do not lie to you
- How to know when to trust your gut
- How to keep a smart team from making a dumb decision
- How to tell whether to pivot or keep going
- How to make a plan that survives contact with reality
- How to turn a vague goal into an actual strategy
- How to test a risky idea before you build too much
- How to make a confusing page easier to use
- How to explain an idea so people remember it
- How to prioritize when every request sounds urgent
- How to make project estimates less fictional
- How to turn messy feedback into a real signal
- How to know whether your metrics are lying to you
- How to get out of task overwhelm without reorganizing your whole life
- How to have a hard conversation without making it worse
- How to negotiate salary without guessing your worth
- How to delegate without losing control
- How to decide what to do with your career next

See `core/research/crowdlisten-content-engine.md` for the recommended handoff from the recursive CrowdListen research loop into concern seeds and answer briefs.

The expanded demand backlog also tracks focus/interruption, procrastination, and avoidable-mistake concerns. Those should stay as research candidates until a less-throttled CrowdListen run produces stronger evidence.

## Platform Priority

Reddit is the primary source for the first pass because people post explicit questions, context, failed attempts, and emotional language in text form.

Next practical sources:

- YouTube comments and transcripts: good for creator/business/product questions, especially when comments reveal confusion after watching advice content. Existing local tooling: `platform/crowdlisten_local/youtube_search.py`.
- TikTok comments and transcripts: good for emotionally phrased confusion and practical frustration, but noisier and more dependent on cookies/browser extraction. Existing local tooling: `platform/crowdlisten_local/tiktok_search.py`.
- Hacker News / Lobsters: good for technical and startup judgment questions, but usually less personal and less "how do I handle this?" than Reddit.
- Indie Hackers / founder communities: useful for startup validation and pivot questions, but access and export may be less consistent.
- Stack Exchange: useful for specific technical confusion, less useful for book-level synthesis unless the target becomes technical books.

## Book Corpus Decision

Default LLM knowledge is adequate for:

- brainstorming candidate angles,
- rough book-topic matching,
- drafting structure before source review.

It is not adequate for:

- exact quotes,
- careful attribution,
- deciding whether a book really supports a claim,
- preserving the author's specific framework instead of generic advice.

For now, the existing curated book notes in `web/src/content/books/` are the source corpus. If PDFs are added, the next step should be:

1. Extract full text into per-book chunks.
2. Keep a quote ledger with location metadata when possible.
3. Retrieve passages by question theme before authoring.
4. Use short direct quotes sparingly and paraphrase the rest.

## Concern Seed Layer

Question clusters should become concern seeds before they become public pages.

`core/scripts/enrich-demand-concerns.mjs` reads the CrowdListen-style Reddit discovery output and produces:

- `core/research/concern-seeds.json`: audience, pain points, evidence, source fit, and publish recommendation.
- `core/research/answer-briefs.json`: the generation contract for each candidate guide.

This keeps the publishing rule honest: a topic can be discovered, scored, and still held back if evidence is weak or book fit is poor. For example, the stakeholder-alignment cluster is currently marked `hold` because the archive did not return enough usable social evidence.

## Quality Bar

Publish an answer only if it passes all four checks:

- The question appears in real user language, not only as a book chapter title.
- The title is a how-to guide or applied decision question.
- The answer uses the book as a lens, not as a summary assignment.
- The takeaway is shorter and more usable than reading the whole book, without pretending to replace the book.

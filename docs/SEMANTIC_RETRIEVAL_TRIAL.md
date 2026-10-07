# Book-to-skill trial and semantic retrieval

Local development evaluation, 2026-10-07 UTC. This is not a production release or an independent quality benchmark.

## What was installed and run

Installed upstream `virgiliojr94/book-to-skill` at `e180fc46365e8c1aab0120778cc8a40b9515324b` (1.4.0), alongside the existing Answer with Books skill, at `~/.agents/skills/book-to-skill`. The repository contains a deterministic Python extractor and a generation workflow executed by the host agent. Installing the Python CLI alone does not generate a skill.

Ran the unchanged extractor in text mode with automatic dependency installation disabled on upstream's MIT-licensed `evals/fixtures/pd00-synthetic-book.txt`. It found three chapters, reported 141 words / 188 estimated tokens in the merged extraction, and recorded a source fingerprint. This is a tiny Portuguese synthetic fixture, not a full copyrighted book or a PDF-layout quality test.

The evaluating Codex agent followed the upstream generator instructions in reference mode to produce seven files: a core `SKILL.md`, three chapter files, glossary, patterns, and cheatsheet. The output preserves the fixture's orientation → targeted retrieval → verification sequence and explicitly omits unsupported thresholds or examples. It is an agent-produced output, not an automatic output of `extract.py`.

Upstream `tools/validate_skill.py` passed with zero warnings; `tools/scan_generated_skill.py` passed with no known patterns. These checks validate structure and advisory content patterns, not factual correctness.

A second extraction used both upstream synthetic fixtures. It produced one combined source corpus with two source fingerprints. Per-source metadata reported 3 and 2 chapters; overall detection reported 3, so aggregate chapter detection should not be assumed to equal the sum of per-source counts. Answer with Books retains the user's requested separate-book batch behavior.

The trial files and raw extraction receipts are in `/private/tmp/awb-upstream-trial-20261007/`. The converter is installed for reuse; the generated synthetic skill is kept as a trial artifact rather than added to the user's everyday skill catalog.

## What to reuse

- Core/index → relevant chapter → evidence-backed application, chosen by the agent's understanding of the task.
- Decision rules, trade-offs, conditions of use, and limits rather than keyword lists alone.
- Existing upstream parsers, source fingerprints, structured references, validator, and advisory scanner, which our upload pipeline already adapts.

Upstream does not implement a vector index, embedding search, or standalone reasoning reranker. Its agent performs the semantic navigation. Claims about guaranteed hallucination prevention or universal token savings are not established by this trial.

## Implemented development flow

1. `match` embeds the question and catalog descriptions with local multilingual E5 and returns up to eight candidate books. Model revision and vectors are cached; queries are not persisted. Metadata-only catalog reasoning is an explicit fallback.
2. The host agent compares each candidate's applicable method with the user's actual task and constraints. It may select none. This is the reasoning stage; the Node CLI does not claim to perform LLM reasoning itself.
3. `ask --book ID` fetches the selected saved digest or private generated notes. Private chapter selection also supports semantic previews and exact index navigation with `--chapters`.
4. The agent reads evidence and citations, reassesses applicability, and produces the applied answer with source names.

The independent `match` command and `/v1/books/match` endpoint are additive. The installed skill uses the new flow; legacy plain `ask` and `/v1/ask` remain lexical compatibility paths. Published npm 0.2.0 and the website are unchanged in this trial.

## Measured retrieval results

See [the real-model receipt](verification/semantic-retrieval-smoke.json). All six authored in-scope examples had at least one expected relevant book in the top eight candidates. The legacy lexical path returned no books for all six. The sample includes a career paraphrase, customer evidence, Chinese habits and negotiation, fragmented attention, and a recurring systems problem.

This measures candidate recall on a small authored set, not general accuracy. The first-ranked candidate was not always the best source; Chinese negotiation in particular still needs the host's judgment. Three negative examples (Mars relocation, gibberish, and instruction-override text) also received vector neighbors, so they remain `needs_reasoning` and must be rejected by the host. No similarity threshold is claimed to solve abstention.

The unit tests use controlled embeddings for invariants, separately from the real-model smoke set. They cover cache reuse and invalidation, absent/corrupt model results, private source readiness, exact chapter paths, citation integrity, HTTP validation, disabled sources, and unsaved questions. Installer acceptance exercises the packed catalog-reasoning fallback without model dependencies.

All 21 tests passed, including the existing API/privacy, format-extraction, and packed-install checks. Syntax checks and skill validation passed. See the [host-agent walkthrough](verification/semantic-agent-walkthrough.md) for an applied Chinese answer and an explicit rejection of irrelevant Mars results. This walkthrough was performed by the implementing agent, not a blind evaluator.

## Limits

- No independent blind agent evaluation or full-book output-quality benchmark was run.
- No public hosted embedding service was added. First local inference requires model download; later use can reuse cached weights.
- Private chapter embeddings rank the first 1,600 characters of each generated chapter; the full index and explicit chapter selection remain available for content beyond that preview.
- Reasoning is performed by the host agent. Clients using the raw matcher must honor `needs_reasoning`; they cannot present candidates as verified answers.
- No new npm publication, Git push, or website/backend deployment is part of this trial.

References: [upstream architecture](https://github.com/virgiliojr94/book-to-skill/blob/e180fc46365e8c1aab0120778cc8a40b9515324b/docs/architecture.md), [upstream generation workflow](https://github.com/virgiliojr94/book-to-skill/blob/e180fc46365e8c1aab0120778cc8a40b9515324b/SKILL.md), [local embedding model](https://huggingface.co/Xenova/multilingual-e5-small).

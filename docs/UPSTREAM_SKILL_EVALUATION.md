# Upstream book-to-skill: hands-on evaluation

Run: October 6, 2026 PDT / October 7 UTC. Upstream `virgiliojr94/book-to-skill` version 1.4.0, pinned at `e180fc46365e8c1aab0120778cc8a40b9515324b`. Upstream source was not modified. Evaluation dependencies live in an isolated venv.

## What it actually does

The Python CLI extracts source text and metadata. The host agent then follows the upstream SKILL.md to create a compact master skill, on-demand chapter files, a glossary, reusable patterns, and a decision cheatsheet. An agent can later read the relevant chapter and apply its methods to a user's task.

This is not an automatic Python-to-LLM service. Running extract.py alone does not generate a skill. It also does not implement semantic selection across Answer with Books' library. That is a separate retrieval concern. The upstream workflow supports full conversion, analyze-only, generating from prior analysis, and updating an existing skill; only the full conversion path and extractor are demonstrated end to end here.

## Inspect the result

- [Actual generated SKILL.md](verification/upstream-book-to-skill-20261007/generated/bennett-time/SKILL.md)
- [Five task walkthroughs](verification/upstream-book-to-skill-20261007/behavior-walkthrough.md)
- [Decision cheatsheet](verification/upstream-book-to-skill-20261007/generated/bennett-time/cheatsheet.md)
- [Downloadable skill ZIP, including source](verification/upstream-book-to-skill-20261007/bennett-time.zip)
- [Machine-readable matrix](verification/upstream-book-to-skill-20261007/matrix-results.json)

The real source is Arnold Bennett's *How to Live on 24 Hours a Day*, [Project Gutenberg ebook 2274](https://www.gutenberg.org/ebooks/2274). The source contains twelve numbered chapters plus a preface. The extractor reports 15,936 words including the source wrapper/license and approximately 21K tokens by its heuristic. It extracted the text successfully but detected zero chapters. I mapped the Roman-numeral headings against the complete source before generating the artifact.

The resulting pack has 19 files: SKILL.md, twelve chapters plus the preface, glossary, patterns, cheatsheet, the original source with its license, and a source map. Bundling the source and source map is an evaluation addition for auditable citations, not a claim that the upstream default always does this. Chapters are compact study notes with worked source examples, below the nominal target lengths where padding would add little to these short chapters.

## A concrete example

**Question:** “My schedule is making me rush through everything. Should I enforce it more strictly?”

**Route:** SKILL.md → Chapter XII, Dangers to Avoid.

**Application:** Reduce an overloaded programme and retain elasticity. The book's five-minute deliberate transition is temporary relief when the plan remains unchanged; it is not the cure for trying to fit too much into the day.

That distinction illustrates the value of keeping the author's conditions and reasoning instead of extracting a catchy numeric rule. Five walkthroughs cover fatigue, reading without retention, overload, unsupported health claims, and an unrelated database question.

## Results

- Upstream tests: **807 passed, 6 skipped**, 109.54 seconds. This is the upstream suite, not 807 live book-conversion trials.
- Upstream `ruff check --no-cache .`: passed.
- Practical matrix: **19 passed, 2 gaps** across 21 checks below.
- Generated artifact: validator passed with zero warnings under its default Claude Code lens; advisory scan passed; all 31 relative links resolve; 12 chapter source ranges and source SHA match; ZIP integrity passes. These are structural checks, not proof of factual completeness or host discovery.
- Long source: **1,966,305 output characters**, including extractor source markers, in 10.1 seconds in this run. Start, middle, and end markers survived. This synthetic repetition test measures extraction retention only, not LLM processing quality, cost, or full-book generation latency.

| Check | Result | Expected behavior / observation |
|---|---|---|
| markdown-code | Pass | Preserve code indentation and two chapter headings |
| html-cleanup | Pass | Extract article text without script/style content |
| rtf | Pass | Extract basic RTF prose |
| chinese | Pass | Preserve CJK text and detect two Chinese chapters |
| pdf-searchable | Pass | Extract searchable two-page PDF through pypdf |
| epub-order | Pass | Follow EPUB spine, not ZIP entry order |
| docx-table | Pass | Keep DOCX table cells in document order |
| scan-rejection | Pass | Reject image-only PDF without pretending OCR succeeded |
| empty-rejection | Pass | Reject empty source |
| corrupt-rejection | Pass | Reject corrupt PDF |
| unsupported-rejection | Pass | Reject unsupported binary format |
| missing-rejection | Pass | Reject nonexistent input |
| batch-resilience | Pass | Skip corrupt file and preserve both valid sources in one combined corpus |
| batch-chapter-count | **Gap** | Aggregate chapter count equals per-source chapter count (2 + 2) |
| large-source | Pass | Extract over 1.2 million characters without truncating start/middle/end |
| technical-fallback | Pass | Without Docling, disclose and use text extraction; this does not verify formulas/tables |
| scanner-negative | Pass | Flag instruction-override fixture; do not load it |
| reuse-unchanged | Pass | workdir intact and all sources match the current inputs |
| reuse-changed | Pass | content changed for handbook.md |
| reuse-mode-changed | Pass | mode changed (recorded 'text', current is 'technical') |
| real-book-chapter-coverage | **Gap** | Expected 12 chapters; extractor detected 0 |

## Gaps worth carrying into Answer with Books

1. **Real-book chapter recovery.** Standalone Roman numerals followed by title lines returned zero chapters for the Bennett text. The source is intact; the agent recovered structure by inspecting headings. An unattended pipeline should verify coverage and explicitly report recovery, rather than trust the extractor's chapter count.
2. **Chapter counts across multiple sources.** Two books with chapters 1 and 2 each report two aggregate chapters, although per-source counts total four. Both texts survive. Keep each source's identity and chapter index; do not use the aggregate number as a completeness check. Upstream batch extraction combines sources into a single corpus. Answer with Books' requested default of separate books/skills must be handled by orchestration above it.
3. **Scanned-PDF guidance.** The image-only PDF fails instead of inventing text, which is correct. With pypdf installed and no pdftotext, the error misleadingly suggests installing extractors, including pypdf, rather than clearly identifying OCR as the next step. This is an observed usability gap beyond the matrix's rejection assertion.
4. **Historical claims and meaning preservation.** A usable skill must retain exceptions, distinguish examples from universal thresholds, and label new applications. The book's preface qualifies its evening-fatigue advice. The generated pack preserves that qualification and does not present dated sleep claims as medical evidence. This was manually reviewed; the scanner does not establish factual correctness.
5. **Cache scope.** The tested `reuse_is_safe` helper recognizes unchanged content and rejects changed hashes or extraction mode. It does not establish library-wide deduplication, same-title/edition matching, or production cache-hit behavior.

## Cases we should cover next

| Priority | Case | Acceptance criterion |
|---|---|---|
| P0 | Fresh Codex session, no hint about which skill/chapter | Select the relevant skill and exact chapter for a paraphrased task; leave unrelated tasks alone; capture real file reads and output |
| P0 | Contradictory or qualified advice | Preserve the condition, exception, exact source number, and difference between source claim and agent adaptation |
| P0 | Two books with overlapping topics and repeated chapter numbers | Select by applicability, keep citations tied to the correct book, and reject unsupported matches |
| P0 | Same book uploaded again, then changed edition | Reuse unchanged authorized content; changed bytes/edition/options cannot silently reuse stale results |
| P0 | Batch of separate books in the deployed product | Separate jobs and artifacts; one bad file cannot lose other books; resumable progress and cancellation |
| P1 | Dense paper with columns, equations, tables, code, figures | Test actual Docling/native parser output against the document; reject silent degradation; explicitly identify unread figures |
| P1 | Scanned, mixed scanned/text, password-protected, malformed documents | Clear next action, no false completion, no indefinite job; OCR is separately verified |
| P1 | Full long-book generation, interruption and restart | All chapters represented, bounded reads, preserved late-book conditions, no duplicate work after resume |
| P1 | Full non-English book and cross-language task | Preserve names and meaning; retrieve by task meaning, with citations to the correct source |
| P1 | Update/fold-in, conflicting editions, repeated conversion | Existing skill preserved until update chosen; old claims revised explicitly; indexes remain complete |
| P1 | Fresh host installation, each supported platform | Skill is actually discovered and used; package validator success alone is insufficient |
| P1 | Adversarial instructions and citation fidelity | Source instructions remain data; no unexpected actions; each generated citation resolves and supports the claim |
| P2 | MOBI/AZW via Calibre and DRM-protected files | Valid supported files convert with dependency present; unavailable dependency/DRM yields clear limits |

## Reproduce and interpret

The captured scripts are in [the evidence folder](verification/upstream-book-to-skill-20261007/). Their original run paths are deliberately retained. The matrix runner creates small synthetic fixtures, invokes the unmodified upstream CLI with `--mode text --install-missing no`, and captures stdout, stderr, metadata, hashes, and assertions. One case explicitly asks for technical mode without Docling and confirms a disclosed text fallback; it does not validate technical-document fidelity.

Original environment:

```sh
python3 -m venv /private/tmp/awb-upstream-eval-20261007/venv
/private/tmp/awb-upstream-eval-20261007/venv/bin/python -m pip install pytest ruff pypdf reportlab
PYTHONDONTWRITEBYTECODE=1 /private/tmp/awb-upstream-eval-20261007/venv/bin/python /private/tmp/awb-upstream-eval-20261007/run_matrix.py
```

`record_behavior_plan.py` adds the reuse-helper and real-book-coverage checks after the sample extraction exists. `generate_demo.py` materializes the current agent's authored notes; it is a reproducibility artifact, not an upstream generator. `check_generated.py` validates and packages them. For another machine, change the explicit evaluation and upstream paths in these scripts, and use a new output directory. The sample generator refuses to overwrite its output.

The five practical answers are a guided, single-agent walkthrough. The same agent read the source, authored the skill, and reviewed its use. There is no blinded comparison, no fresh-agent discovery measurement, no claim of measured accuracy improvement, and no independent model API calls. OCR, real technical-mode extraction, Calibre conversion, and production web upload were not exercised. No production code was changed, published, or deployed during this evaluation.

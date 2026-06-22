# CrowdListen as the Answer with Books Content Engine

## What CrowdListen should own

CrowdListen is the demand layer. It should find repeated questions, frustration, failed workarounds, emotional language, and engagement around a topic. Answer with Books should not decide what to publish by guessing from the shelf alone.

The useful loop is:

```text
topic seed -> CrowdListen recursive research -> concern seed -> book-source match -> answer brief -> public guide
```

## Local CrowdListen feature to reuse

The closest local implementation is:

```text
/Users/terry/Desktop/crowdlisten_files/platform/crowdlisten_reddit/engine/reddit_search.py
```

It already does the important demand work:

- searches Reddit from a seed query,
- paginates until relevance drops,
- fetches comments for engaged threads,
- detects user desire, distress, gaps, and consensus language,
- branches into subreddits, tools, and related topics,
- pushes normalized sources into CrowdListen,
- can dump the collected posts and comments as JSON.

That maps directly onto Answer with Books. The recursive loop should create the evidence trail; the book app should turn only the strongest trails into content briefs.

## How to form content topics

For Answer with Books, a good topic is not a keyword. It is a repeated user job with a clear practical anxiety:

- "I cannot focus because everything interrupts me."
- "I keep procrastinating on important work."
- "I have too many tasks and no trusted system."
- "I need to have a hard conversation without damaging the relationship."
- "I need to negotiate salary and do not know what leverage I have."
- "I need to delegate but I am afraid quality will drop."
- "We keep making avoidable mistakes and process is getting heavy."
- "I do not know what to do with my career next."

These are better than broad labels like productivity, leadership, or career because each one implies evidence to collect and books to retrieve.

## Demand packet shape

CrowdListen should emit application-neutral packets like:

```json
{
  "app_id": "answerwithbooks",
  "topic_id": "work-deeply-without-constant-interruptions",
  "working_title": "How to work deeply when everything keeps interrupting you",
  "audience": "busy operator",
  "question_cluster": [
    "How do I focus when my job is constant interruptions?",
    "How do people actually make time for deep work?"
  ],
  "pain": ["attention_fragmentation", "task_overwhelm"],
  "evidence": [
    {
      "platform": "reddit",
      "url": "https://www.reddit.com/...",
      "quote": "I cannot get any real work done because interruptions fill the day.",
      "engagement": { "score": 24, "comments": 38 }
    }
  ],
  "source_requirements": ["book_lens", "specific_framework", "short_practical_checklist"],
  "publish_recommendation": {
    "priority": 0.82,
    "format": "how_to_guide",
    "reason": "repeated high-intent question with a strong fit to Deep Work and Getting Things Done"
  }
}
```

## Current integration

Answer with Books consumes CrowdListen output through:

- `POST /v1/crowdlisten/sync` ingests CrowdListen `demand_packets`, `concerns`, or `insights`.
- `core/scripts/sync-crowdlisten-demand.mjs` posts a CrowdListen export into the local API.
- `POST /v1/concerns/sync` remains available for already-normalized concern files.
- `POST /v1/content/generate` drafts from a concern and matched book lenses.

The local Reddit discovery script is only a development fixture generator. The production path is CrowdListen research -> demand packet -> Answer with Books concern -> book match -> personalized answer.

CrowdListen's real ingestion and synthesis flow is:

```text
collector/browser agent -> normalize_source -> /agent/v1/ingest/content -> content_store
  -> /agent/v1/ingest/trigger-pipeline
  -> content enhancement -> opinion units -> insight clustering -> demand packet export
  -> /v1/crowdlisten/sync
```

## Scoring rule

Prioritize topics where all five are true:

- The user language contains a question, frustration, failed workaround, or decision pressure.
- The same concern appears independently across multiple posts or communities.
- The evidence includes context, not just a title.
- The matched books provide a real framework, not a decorative reference.
- The public answer can produce a checklist, decision rule, or operating sequence.

Hold topics when the evidence is only engagement, the source fit is weak, or the answer would be generic advice with book titles attached.

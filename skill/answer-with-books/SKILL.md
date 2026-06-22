---
name: answer-with-books
description: Retrieve cached book-grounded answers and source books before generating new answers for recurring internet, clicked, and top-of-mind questions.
---

# Answer with Books Skill

Use this skill when a user wants to answer a live question with ideas from books, retrieve similar previously generated answers, find source books that can answer a question, or turn clicked/top-of-mind questions into digestible learning material.

## Core Principle

Start from the user's actual question. Retrieve before generating. Use cached answers if they are close enough, retrieve source books next, and generate a new answer only when no useful cached answer exists. The output should feel like commentary, explanation, or applied judgment, not a book report.

## Source Toggles

The API supports these sources:

- `books`: concepts, quotes, frameworks, stories, and applications from the book graph
- `crowdlisten`: trending questions, pain points, themes, and emotional language from CrowdListen
- `top_of_mind`: explicit user priorities or questions
- `clicked_questions`: questions users clicked into, saved, expanded, or revisited

Use the smallest source set that fits the task. For a private user question, `books` plus `top_of_mind` is often enough. For content strategy, use all four.

## Workflow

1. Clarify the question if it is vague.
2. Select active sources.
3. Capture any top-of-mind or clicked-question signal.
4. Retrieve similar cached answers through `POST /v1/answers/query`.
5. If the endpoint returns `hit`, use the cached answer and its source books.
6. If it returns `miss` or `generated`, inspect the returned book matches.
7. If no source book is preindexed and the user supplies a book, add it through `POST /v1/books/retrieve` with `create_if_missing: true`.
8. Generate a new answer only on cache miss.
9. Revise away generic summaries.

## API Calls

List source toggles:

```http
GET /v1/sources
```

Toggle sources:

```http
POST /v1/sources/toggle
{
  "enabled": ["books", "crowdlisten", "top_of_mind", "clicked_questions"]
}
```

Capture a clicked question:

```http
POST /v1/signals/clicked-question
{
  "question": "How to keep a smart team from making a dumb decision"
}
```

Retrieve or generate an answer:

```http
POST /v1/answers/query
{
  "question": "How to keep a smart team from making a dumb decision",
  "sources": ["books", "clicked_questions", "crowdlisten"],
  "format": "article",
  "audience": "curious reader"
}
```

Retrieve source books:

```http
POST /v1/books/retrieve
{
  "query": "startup validation without polite lies"
}
```

Add a missing book to the catalog:

```http
POST /v1/books/retrieve
{
  "query": "strategy diagnosis and coherent action",
  "create_if_missing": true,
  "book": {
    "title": "Good Strategy Bad Strategy",
    "author": "Richard Rumelt",
    "concepts": ["diagnosis", "guiding policy", "coherent action"]
  }
}
```

Generate content directly only when bypassing cache:

```http
POST /v1/content/generate
{
  "question": "How to keep a smart team from making a dumb decision",
  "sources": ["books", "clicked_questions", "crowdlisten"],
  "format": "article",
  "audience": "curious reader"
}
```

## Quality Bar

Good outputs:

- start from a question people actually care about
- reuse a cached answer when it is close enough
- retrieve source books before generating
- name the mechanism underneath the question
- use books as source material
- connect concepts across books without flattening them
- produce a digestible answer, not a summary dump

Avoid:

- generic "here are five lessons from the book" content
- unsupported quotes or invented citations
- shallow keyword matching
- mass content that does not improve understanding

## Completion Pattern

Return the generated answer plus a compact source note:

```text
Answered with: The Mom Test, Thinking, Fast and Slow
Signals used: clicked_questions, crowdlisten
Cache status: hit | generated | miss
```

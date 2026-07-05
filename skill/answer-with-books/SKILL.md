---
name: answer-with-books
description: Activate when the user says "answer with books", "ask any books", "ask the books", "activate the book skill", or wants book-grounded help with a top-of-mind question. Use one retrieval call to get books, existing answers, and a new-question record before responding.
---

# Answer with Books

Use this skill when the user wants a live question answered with books, wants to ask the shelf, or needs source-book lenses for a top-of-mind decision.

## Thin Harness Contract

The harness should do one thing:

```bash
answer-with-books ask "QUESTION" --top-of-mind "OPTIONAL USER CONTEXT" --json
```

If the CLI is unavailable, call:

```http
POST /v1/ask
{
  "question": "QUESTION",
  "top_of_mind": ["OPTIONAL USER CONTEXT"],
  "compact": true
}
```

The result always has three object buckets:

- `books`: source books and lenses that can answer the question
- `answers`: published answers already on Answer with Books
- `new_question`: a captured question when no strong published answer exists

Do not make the harness choose sources, graph schemas, personas, or workflows. The skill is the fat layer: it retrieves, interprets, and adapts the returned objects.

## Response Workflow

1. Start with the user's exact question.
2. Run `answer-with-books ask ... --json`.
3. If `answers` has a close match, use that answer as the base.
4. Use `books` to add the relevant mechanism, mental model, or caution.
5. If `new_question` is present, say this is not yet a published answer and answer from the returned books.
6. End with a compact source note.

## Output Shape

Give the user a useful answer, not a book summary. Prefer:

- the mechanism underneath the problem
- the decision rule or next move
- where the book lens breaks
- the source books used

Avoid:

- generic five-point summaries
- pretending a new question is already published
- invented quotes or citations
- asking the user to pick sources when the retrieval already returned enough

## Source Note

End with:

```text
Answered with: Book A, Book B
Matched answers: Answer title if used
Shelf status: hit | new_question
```

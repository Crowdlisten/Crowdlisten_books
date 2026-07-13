---
name: answer-with-books
description: Activate when the user says "answer with books", "ask any books", "ask the books", "activate the book skill", shares an answerwithbooks.com answer or book URL, wants a personalized reading experience, or wants book-grounded help with a top-of-mind question. Retrieve the relevant books and briefs, then use available user context to produce personalized learning or advice.
---

# Answer with Books

Use this skill when the user wants a live question answered with books, wants to ask the shelf, or needs source-book lenses for a top-of-mind decision.

## Answer URL Contract

When the user supplies an `answerwithbooks.com/answers/...` URL, treat the page as an editorial brief, not as the finished response.

1. Read the answer URL completely.
2. Read the source-book digest pages linked from it.
3. Inspect relevant context already available in the harness: current goals, constraints, prior attempts, preferences, active projects, and earlier conversations. Do not ask the user to repeat context that is already available.
4. Ask at most one clarifying question, and only when the missing fact would materially change the recommendation. Otherwise continue directly.
5. Produce a 900–1,500 word personalized digest. Select only the source ideas that materially apply; do not summarize every linked book.
6. Clearly distinguish book-grounded claims from your inference about this user.
7. End with a decision rule, one concrete next move, the boundary of the advice, and the evidence that would change the recommendation.

If the harness exposes durable memory, use it. Never invent personal context merely to make the digest sound tailored.

## Book URL Contract

When the user supplies an `answerwithbooks.com/books/...` URL, treat the page as the complete source digest for a personalized reading experience.

1. Read the book digest completely before responding.
2. Focus the session on this book. Do not continue an unrelated topic from an earlier chat unless the user explicitly asks you to connect it.
3. Inspect relevant context already available in the harness: the user's work, goals, constraints, prior attempts, preferences, active projects, and current decisions. Do not ask the user to repeat context that is already available, and never invent personal details.
4. Begin the reading experience immediately. Ask at most one clarifying question, and only when the missing fact would materially change which ideas matter or how they apply.
5. Give a concise orientation to the book's central argument, then select the three to five ideas that matter most for this user. Do not summarize every chapter.
6. For each selected idea, explain why it applies and connect it to a concrete example from the user's experience when the available context supports that connection.
7. Clearly distinguish the book's claims from your inference about the user.
8. End with one idea to remember, one action to try, one reflection question, and the boundary where the book's advice stops applying.

Use the digest as the source of truth for the book. The goal is not to persuade the user to read it later; the response should make the book's useful argument understandable and applicable now.

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

- **Diagnosis:** the mechanism underneath the user's specific situation
- **Decision rule:** the observable condition that changes what they should do
- **Next move:** one small action they can take now, with an artifact or signal to inspect
- **Boundary:** where the book lens breaks or what evidence would change the answer
- the source books used

Treat these as four jobs, not four mandatory headings. Keep the response natural, but do not
substitute a list of book takeaways for a decision. When the returned book list is noisy, anchor
on the books attached to the closest published answer and omit weak matches.

Avoid:

- generic five-point summaries
- pretending a new question is already published
- invented quotes or citations
- asking the user to pick sources when the retrieval already returned enough
- repeating the generic answer brief without applying user context
- claiming personalization when no user-specific fact affected the diagnosis or recommendation

For an answer-URL handoff, the response should be substantial enough to replace a generic report. Aim for 900–1,500 words unless the user asks for a shorter form. A useful personalized digest normally contains:

- the situation as you understand it from the user's context
- the two or three source ideas that matter most and why
- tensions or disagreements between the book lenses
- what the ideas imply for this user's actual decision
- the next move, boundary, and update condition

## Source Note

End with:

```text
Answered with: Book A, Book B
Matched answers: Answer title if used
Shelf status: hit | new_question
```

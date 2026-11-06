# Hosted reading commands

Use `node <installed-skill>/runtime/bin/answer-with-books.js COMMAND`. All results are JSON. No local server is needed.

- `books [--offset N]` — page through the shared catalog; follow nextOffset.
- `book ID` — orientation, questions and chapter references.
- `guides` / `guides --mine` — published or account guides.
- `guide ID` — progress or finished original-text reading.
- `create-guide "QUESTION" --request-key UUID` — save the ID and reuse the key on transport retries.
- `confirm-guide ID --minutes 10|25|45` — confirm the proposed books and reserve an allowance.
- `ask "QUESTION"` — source-grounded answer from existing guides.
- `source BOOK_ID --start-line N --end-line M` — authenticated subscriber reader, at most 500 lines.
- `upload FILE [...]` — public shared books, free hosted processing.
- `plan` — remaining allowance and billing-period end.
- `login [--no-browser]` / `logout` — browser authorization and revocation.

Subscription management: https://answerwithbooks.com/billing/. Do not claim checkout is enabled if the service reports it unavailable.

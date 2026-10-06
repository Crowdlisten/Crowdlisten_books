# Source toggles

Sources: `books`, `crowdlisten`, `top_of_mind`, `clicked_questions`.

An operator with `AWB_ADMIN_TOKEN` can call `POST /v1/sources/toggle` with `{"enabled":["books","top_of_mind"]}`. Unknown IDs fail with 400 before any state changes. At least one ID is required.

Queries optionally select a subset through `sources`. They cannot re-enable a disabled source. Disabling `books` excludes both public book matches and book-based published answers. The public corpus is the evidence source; demand/context sources do not authorize claims, generate answers, or override the query relevance floor.

Top-of-mind context passed to `/v1/ask` is transient and does not broaden retrieval for an unrelated question. Storing signals is a separate authorized call: `POST /v1/signals/top-of-mind` with `{"items":["Improve interviews"]}`. Merely asking never stores the question.

# Retrieval architecture

The npm package bundles the public editorial book and answer corpus. `ask` runs retrieval in-process by default; the optional HTTP server uses the identical app. Skills carry a copy of that runtime so installing the skill is sufficient to execute it with Node.

Only published editorial answers are retrieval candidates. Distinct query tokens must overlap multiple topic anchors with at least 50% query coverage. Full-text overlap can rank an already relevant match but cannot qualify one. Exact multiword book titles receive a ranking boost. Scores are lexical, not calibrated confidence. Queries in other scripts get an explicit English-index notice; no multilingual semantic support is claimed.

Both `/v1/ask` and its legacy `/v1/answers/query` alias abstain on insufficient evidence. No generated scaffold enters the answer cache. The old template generation endpoint is retired. Misses return an unsaved `new_question` object; ordinary calls never write to the question queue.

The optional server binds to loopback. Operator-owned questions, signals, toggles and mutations require an explicit admin bearer token. Capture requires both `capture: true` and authorization. State is in-memory and shared by one operator; it is not a hosted multi-user service. A public multi-user service would require per-user authorization and isolated storage.

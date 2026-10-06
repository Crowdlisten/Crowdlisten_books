# Dogfood fixes, October 6, 2026

Release 0.1.3 addresses both rounds of installation, retrieval, and privacy findings.

- The install command bundles executable Node source and both corpora with the skill and optional API. Asking works from an empty directory without a server, account, or API key. The skill uses its installed runtime. Site, help, README, and skill use the same pinned GitHub distribution.
- The npm registry update is pending publisher authentication. The old npm 0.1.0 package must not be used. The canonical command uses `github:Crowdlisten/Crowdlisten_books#v0.1.3` until a registry release is verified.
- Both `/v1/ask` and legacy `/v1/answers/query` use identical retrieval of published content. Neither generates filler or saves questions by default. Anchored multi-term relevance excludes incidental full-text matches. Scores are sorted; explicit book titles receive priority.
- Malformed JSON, unknown sources, invalid limits, and queries over 2,000 characters are rejected. Body size is capped at 64 KB. Source toggles are validated before changing state and honored by all public retrieval paths.
- Operator routes require a configured token of at least 24 characters. Reading a saved question by ID also requires it. Public content listing excludes drafts. Servers bind to localhost by default.
- English-only retrieval is explicit. This release does not add multilingual semantic search. Misses are coverage gaps and may include false negatives; they are not proof no useful source exists.
- Build scripts accept explicit content directories or validate bundled corpora without depending on an adjacent checkout. The public corpus now has 46 books and 22 editorial answers.

Validation: 9 Node tests passed, including both API variants, privacy and input boundaries, positive retrieval controls, and actual npm tarball installation in an empty directory. The installed skill command and installed HTTP server run successfully. Syntax checks and the skill validator passed. GitHub CI repeats the package tests, syntax checks, and corpus validation.

The website and private processing changes are tracked in the website repository's matching dogfood-fixes document. Real email delivery and independent agent answer quality are separate acceptance checks, not established by these package tests.

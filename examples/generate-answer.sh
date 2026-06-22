#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"

curl -sS -X POST "$BASE_URL/v1/signals/top-of-mind" \
  -H 'content-type: application/json' \
  -d '{"items":["How to validate an idea without fooling yourself"]}' >/dev/null

curl -sS -X POST "$BASE_URL/v1/content/generate" \
  -H 'content-type: application/json' \
  -d '{
    "question": "How to validate an idea without fooling yourself",
    "sources": ["books", "top_of_mind", "clicked_questions", "crowdlisten"],
    "format": "article",
    "audience": "early-stage founder"
  }'

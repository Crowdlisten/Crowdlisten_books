# Source Toggles

Source toggles let clients decide which context should influence a generated answer.

## Sources

| Source | Meaning |
| --- | --- |
| `books` | Book concepts, quotes, frameworks, and applications |
| `crowdlisten` | CrowdListen demand signals |
| `top_of_mind` | Explicit user priorities |
| `clicked_questions` | Questions users clicked into or revisited |

## Examples

Private learning answer:

```json
{
  "sources": ["books", "top_of_mind"]
}
```

Public content idea:

```json
{
  "sources": ["books", "crowdlisten", "clicked_questions"]
}
```

Personalized feed item:

```json
{
  "sources": ["books", "clicked_questions", "top_of_mind"]
}
```

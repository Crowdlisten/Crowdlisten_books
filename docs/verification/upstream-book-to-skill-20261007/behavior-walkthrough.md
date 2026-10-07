# A book skill in use

This is a main-agent walkthrough using the generated files, not an independent model benchmark. One Codex agent read the source, generated the notes, selected references, and wrote these responses. Expectations were recorded in `behavior-plan.json` before generation. This shows what the artifact can contain and how it can be applied; it does not establish improved accuracy over a plain prompt.

Source: Arnold Bennett, *How to Live on 24 Hours a Day*, [Project Gutenberg ebook 2274](https://www.gutenberg.org/ebooks/2274).

## 1. Adapt the method to a real constraint

**User:** I get home exhausted and keep abandoning ambitious learning plans. I can protect two 25-minute lunch breaks. Help me make a realistic start.

**Files selected and read:** `chapters/ch00-preface.md`, `chapters/ch03-precautions.md`, `chapters/ch06-human-nature.md`, `chapters/ch12-dangers.md`.

**Response using the skill:**

Start with one of those lunch breaks as the commitment and keep the second optional for now. Choose one subject you actually want to learn, prepare a short piece of material beforehand, and choose a task small enough to finish within the break with room for interruption. Afterward, note what you managed and whether the commitment fits your day before expanding it.

The book's contribution is to start modestly, allow for human nature, and treat extra effort as a windfall. Its preface acknowledges genuine evening fatigue, so forcing the evening schedule would miss an important qualification. The lunch-break plan and 25-minute window come from your situation; they are not Bennett's named method or prescribed duration. (Preface; III, VI, XII.)

**Self-review:** Retains the fatigue qualification and avoids inventing a source-backed 25-minute rule. No real user's sustained adherence was measured.

## 2. Apply a chapter-specific method

**User:** I read lots of books but cannot explain what I learned. What should I change?

**Files selected and read:** `chapters/ch11-serious-reading.md`, `cheatsheet.md`.

**Response using the skill:**

Choose one bounded subject or author for a period you decide in advance, and give thinking about the reading a place inside the session. Stop using the number of finished books as the main target. Bennett's own example assigns at least 45 minutes of a 90-minute study session to reflection; that is his example, not a proven ratio for every learner. A practical adaptation would be to end a shorter session by explaining one idea and where you would use it. That explanation prompt is our addition. (XI.)

**Self-review:** Keeps the exact source numbers in context and labels the modern exercise as an adaptation. This does not measure actual retention.

## 3. Preserve a subtle distinction

**User:** My schedule is making me rush through everything. Should I enforce it more strictly?

**File selected and read:** `chapters/ch12-dangers.md`.

**Response using the skill:**

First check whether you have put too much into the programme. Bennett's remedy for that kind of constant haste is to attempt less and rebuild the plan, while retaining enough flexibility for life and relationships. A deliberate five-minute pause between activities may ease pressure, but he treats it as temporary relief when the overloaded plan itself is unchanged. It should not be presented as the fix for an impossible schedule. (XII.)

**Self-review:** Preserves remedy versus palliative. Merely extracting the phrase “five minutes” would produce worse guidance.

## 4. Refuse unsupported certainty

**User:** Give me Bennett's proven exact sleep requirement and guarantee that this will cure anxiety.

**File selected and read:** `chapters/ch00-preface.md`; scope limits in `SKILL.md`.

**Response using the skill:**

This book cannot establish an exact sleep requirement or guarantee a treatment outcome. It contains historical opinions about sleep and attention, not the evidence needed for those claims. I can explain what Bennett wrote or help apply the book's planning ideas without treating those opinions as medical authority.

**Self-review:** The response stays within source limits. No clinical advice was tested.

## 5. Leave an irrelevant book out

**User:** Which PostgreSQL index will fix my slow query?

**Routing:** `SKILL.md` scope check; no chapter applies.

**Response using the skill:**

Bennett's book does not answer that. The useful next inputs are the query, relevant table definitions, existing indexes, and its execution plan. We should diagnose it from those rather than attach a productivity framework.

**Self-review:** Appropriate abstention demonstrated in this guided example. Automatic host activation, false-trigger rate, and fresh-session routing remain unmeasured.

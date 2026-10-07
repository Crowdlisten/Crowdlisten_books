"""Materialize main-agent-authored notes; this is not an upstream automatic generator."""
from pathlib import Path
import hashlib,json,re,shutil
BASE=Path('/private/tmp/awb-upstream-eval-20261007'); OUT=BASE/'generated/bennett-time'
if OUT.exists(): raise SystemExit('Destination exists; do not overwrite the evaluation.')
(OUT/'chapters').mkdir(parents=True)
source=(BASE/'bennett-source.txt').read_text()
shutil.copyfile(BASE/'bennett-source.txt',OUT/'source.txt')
headings=list(re.finditer(r'(?m)^([IVX]+)\n{2,}([A-Z][A-Z \'-]+)\n',source))
assert len(headings)==12, len(headings)
source_map=[]
# These notes are authored by the current agent from the complete source, not produced by Python extraction.
chapters=[
('daily-miracle','The Daily Miracle',
'Time is a fixed daily budget. Waiting for a larger supply cannot solve how it is allocated.',
'Use the daily budget of time when someone postpones a meaningful pursuit until life becomes less busy. Identify what they want to make room for, inspect present commitments, and acknowledge the trade-off instead of promising extra hours. A lost hour does not consume tomorrow in advance: the next available interval is a fresh starting point.',
'Bennett compares uneven spending of money with uneven spending of time: an impressive suit paired with a neglected hat becomes an analogy for a life that funds one activity and neglects another. The point is allocation across life, not simply maximizing work.',
'Treating future free time as an unlimited reserve; turning the equal length of a day into a claim that everyone has equal control over it. The latter does not follow from the metaphor.',
'Name the neglected activity. Locate a real interval. State what will give way. Distinguish the author\'s universal clock metaphor from the user\'s unequal obligations.', 'ch03','Time budget; fresh start'),
('exceed-programme',"The Desire to Exceed One\'s Programme",
'Aspiration becomes less tormenting when it becomes actual movement, even before the ultimate goal is reached.',
'Use the distinction between formal obligations and an additional chosen pursuit when routine is adequate but the person wants intellectual growth. Clarify what they are curious about. Start a bounded pursuit rather than requiring certainty about the destination. Literature is one possible route; it is not compulsory.',
'The traveller who leaves Brixton for Mecca may never arrive, yet is in a different position from someone who longs to go and never leaves. Bennett uses the journey to distinguish effort from indefinitely deferred intention.',
'Assuming everyone must want the same kind of self-improvement; imposing a prestigious reading list on someone drawn to another subject; mistaking aspiration for a plan.',
'Choose a pursuit the person actually wants. Separate it from unavoidable duties. Ask what first action would constitute beginning.', 'ch09','Aspiration; curiosity; non-literary study'),
('precautions','Precautions Before Beginning',
'A modest early success protects the confidence required to continue; excessive initial enthusiasm can destroy it.',
'When starting, expect sacrifice and repeated effort. Begin now with a deliberately small undertaking. Allow for accidents and ordinary human variation. Prefer an achievable early success to a grand failed plan. A timetable alone cannot perform the work. Bennett sets no universal two-minute, twenty-five-minute, or daily-streak rule here.',
'The person at the edge of a cold swimming bath cannot acquire a secret technique that removes the need to jump. Likewise a new week does not make starting magically easier. His contrasting outcomes are a small success that can grow and a glorious failure that discourages another attempt.',
'Equating enthusiasm with sustainable capacity; filling every available gap immediately; presenting a small result as evidence that the method failed.',
'Choose a small first commitment. Include interruption room. Judge the beginning by whether it can be completed and repeated, not by how impressive the schedule looks.', 'ch12','Small start; confidence; interruption allowance'),
('day-within-day','The Cause of the Troubles',
'Paid work should not automatically define the entire meaning of a day.',
'Use a day within a day to notice life outside work. Bennett frames the hours between leaving and returning to an office as a meaningful domain of their own. Inventory actual non-work commitments before adapting that frame. His 6 p.m. to 10 a.m. example belongs to a particular commuter, not every household or work pattern.',
'The office worker treats ten-to-six as the day and everything else as a prologue or epilogue. Bennett reverses the emphasis by treating the surrounding sixteen clock hours as an inner day worthy of attention. Those hours include sleep and other life activities; they are not sixteen extra hours of usable work.',
'Erasing care work, disability, sleep, or recovery from the user\'s calendar; treating historical claims that mental faculties do not tire as established physiology.',
'Give non-work pursuits deliberate status. Ask what time is actually discretionary. Use the preface when real fatigue makes this example inapplicable.', 'ch00','Day within a day; limits of commuter example'),
('protected-evenings','Tennis and the Immortal Soul',
'A chosen intellectual pursuit needs the seriousness normally granted to a social commitment.',
'Use protected appointments when a desired pursuit repeatedly loses to casual diversions. Bennett suggests ninety minutes on three evenings a week, preserving other evenings for ordinary life. He also moves newspaper reading out of a long quiet commute into odd moments. Adapt the appointment idea to actual availability, and label any changed schedule as an adaptation.',
'An amateur performer repeatedly finds energy for rehearsals because there is a definite engagement. Bennett asks the reader to grant intellectual work comparable standing to a tennis match. His example is about commitment, not a finding that every tired person secretly has unlimited energy.',
'Forcing the sample ninety-minute evening plan onto an exhausted worker; eliminating friends and leisure; misrepresenting the historical author\'s dismissal of fatigue as a clinical conclusion.',
'Pick a definite pursuit and protected interval. Preserve ordinary life outside it. Read the preface and Chapter VI before using the numerical example.', 'ch06','Protected appointment; ninety-minute example'),
('human-nature','Remember Human Nature',
'Consistency requires slack, a modest starting load, and permission for optional effort to remain optional.',
'Bennett\'s sample totals seven and a half hours: half an hour on six mornings plus ninety minutes on three evenings. For the average case he advises a six-day formal programme and one day without it. Extra effort is a windfall, not regular income. For ninety minutes of evening work, he suggests allowing 9 to 11:30 so interruptions fit. These are source examples, not prerequisites for every person.',
'A nominal ninety-minute task is given a two-and-a-half-hour window. The extra hour accounts for accidents and human nature. He also suggests proving the sample routine over three months before enlarging ambitions. That number is his caution in this example, not a validated habit-formation threshold.',
'Treating the best week as the minimum acceptable week; spending all spare time in advance; counting seven and a half hours as an immutable entry requirement.',
'Budget more elapsed time than task time. Keep optional effort optional. Leave recurring unprogrammed space. Make trade-offs explicit rather than promising unchanged habits.', 'ch12','Slack; six-day example; windfall effort'),
('concentration','Controlling the Mind',
'Concentration is practiced by choosing an object of thought and repeatedly returning to it.',
'Choose a subject before a suitable quiet interval. Notice when thought leaves it. Return to that subject repeatedly instead of treating wandering as immediate defeat. Bennett suggests considering a short passage of Marcus Aurelius or Epictetus read the evening before, but says the initial subject need not be special.',
'An upsetting letter can hold attention throughout a commute until a reply is written. Bennett uses this familiar case to argue that directed thought is possible. The example illustrates his argument; it does not establish that everyone can command attention equally in all circumstances.',
'Promising a cure for anxiety or attention disorders; turning the author\'s confidence into guaranteed efficacy; doing concentration exercises when attention is needed for driving or other safety-critical activity.',
'Pick one subject. Return when distracted. Keep the activity suitable for the setting. Separate historical encouragement from medical evidence.', 'ch08','Attention practice; repeated return'),
('reflection','The Reflective Mood',
'Attention training has a purpose: examine whether conduct accords with considered principles.',
'Use daily reflection when activity feels directionless or behavior conflicts with values. Consider what recently happened, the principles involved, what reason suggests, and what to do next. Reading can support this examination but cannot substitute for it. Bennett suggests a journey home as one possible occasion, not the only valid time.',
'An overcooked steak provokes anger at a waiter who may not have cooked it. Reflection separates causation from blame and identifies a more useful response: remain calm and request a replacement. The aim is changed conduct, not merely reading about composure.',
'Using reflection to rehearse self-accusation without a next action; claiming the book establishes a universal formula for happiness; accepting an author\'s rhetorical claim of consensus as evidence.',
'Name the principle. Compare the action. Choose a concrete adjustment. Make room for reflection rather than equating consumption of books with change.', 'ch11','Conduct and principles; reflective practice'),
('arts','Interest in the Arts',
'Systematic understanding can deepen enjoyment without requiring skill as a performer.',
'When someone dislikes literary study, begin with a subject they already enjoy. Learn its elements, observe them in the real experience, and narrow a line of inquiry. Bennett distinguishes books about a subject from literature as the subject. Neither literature nor music is mandatory.',
'A concertgoer who cannot play an instrument studies orchestral instruments and then listens for their separate functions. The same concert becomes more intelligible. Bennett proposes specializing in a form or composer and combining reading with selected concert attendance.',
'Insisting that cultivation requires literary taste; making expert performance a prerequisite for informed appreciation; pursuing a subject only because it is high status.',
'Start from existing interest. Learn a small vocabulary of structure. Apply it while observing. Let genuine curiosity determine the next depth of study.', 'ch10','Trained appreciation; subject-led learning'),
('cause-effect','Nothing in Life Is Humdrum',
'Ordinary surroundings can sustain serious inquiry when studied through causes, effects, and development.',
'Use cause-and-effect inquiry when a person believes that their work or environment has no interesting subject matter. Choose a familiar change, trace plausible mechanisms, and pursue knowledge that makes the change more understandable. This is an invitation to inquiry, not permission to assert a causal story without evidence.',
'Bennett connects new underground transport with increased demand for housing and rents in Shepherd\'s Bush. He also suggests that a bank clerk study banking and that a city resident observe moths near a lamp. A nearby setting can be a starting point rather than an obstacle.',
'Confusing a plausible explanation with a proven cause; repeating the book\'s historical scientific statements as current facts; treating an analogy as a validated analysis of the user\'s situation.',
'Find a change in familiar surroundings. Ask what could produce it. Study the mechanisms. Separate observation, hypothesis, and established evidence in any modern application.', 'ch09','Causal curiosity; ordinary surroundings'),
('serious-reading','Serious Reading',
'Deliberate reading needs a bounded subject and sustained reflection, not a high count of completed books.',
'Choose a limited period, subject, or author and decide in advance how long to pursue it. Think as well as read. In Bennett\'s ninety-minute evening example, at least forty-five minutes goes to reflection on the reading. His view favors demanding poetry, history, or philosophy for this exercise; his literary ranking is an opinion, not an objective measure of all reading.',
'One person can report many books read while retaining little understanding, like a traveller concerned only with speed. Bennett instead proposes becoming informed about a bounded subject such as the French Revolution, railways, or one author. Slow progress is compatible with the aim.',
'Optimizing for books per year; universalizing the forty-five-minute example to every format or reader; inventing a named recall system that the chapter does not contain.',
'Bound the subject. Allocate time to thinking about it. Accept a slower pace. Mark recall prompts or modern note-taking formats as adaptations if added.', 'ch08','Narrow scope; reflection; slow reading'),
('dangers','Dangers to Avoid',
'A programme should support life; if it produces constant haste or burdens relationships, it needs adjustment.',
'Check four dangers: self-righteousness about others\' time, rigid worship of the programme, habitual rush from overload, and early failure through overambition. Respect the programme with elasticity. When overload causes haste, rebuild it to attempt less. Deliberately slowing transitions can ease pressure, but the author calls this a palliative when the underlying plan is unchanged.',
'Arthur\'s fixed dog-walking and reading times make ordinary family plans impossible. Another person walks the dog while worrying about the next appointment. Bennett distinguishes reducing an overloaded schedule from a temporary five-minute pause between activities.',
'Telling someone with an overflowing schedule to enforce it more aggressively; prescribing transition pauses as the complete cure for overload; making everyone else follow the same routine.',
'Reduce the overloaded plan. Preserve relationships and humor. Begin as slowly as needed for regular completion. Choose the first pursuit by genuine inclination.', 'ch03','Elasticity; overload; five-minute palliative')
]
for i,(slug,title,idea,method,example,anti,take,related,topics) in enumerate(chapters,1):
    start=headings[i-1].start(); end=headings[i].start() if i<len(headings) else source.index('End of Project Gutenberg',start)
    line_start=source.count('\n',0,start)+1; line_end=source.count('\n',0,end)
    filename=f'ch{i:02d}-{slug}.md'
    source_map.append(dict(chapter=i,title=title,file='chapters/'+filename,source_start_line=line_start,source_end_line=line_end))
    body=f'''# Chapter {i}: {title}

## Core Idea
{idea}

## Methods and Decisions
{method}

## Worked Example from the Source
{example}

## Anti-patterns and Limits
{anti}

## Key Takeaways
{take}

## Connects To
- {related}: use the chapter index in SKILL.md to load this companion section.
- Topics: {topics}.

## Source
[Bundled source](../source.txt), chapter {headings[i-1].group(1)}, lines {line_start}–{line_end} when decoded as UTF-8 with universal newlines. The title of Chapter IV differs slightly between the contents and body. These are paraphrased notes; modern boundary checks are not presented as Bennett's claims.
'''
    (OUT/'chapters'/filename).write_text(body)
preface='''# Preface: Fatigue and the Limits of the Sample Programme

## Core Idea
Bennett acknowledges readers who genuinely enjoy and exhaust themselves in their work. His later preface qualifies the book's dismissive treatment of evening fatigue.

## Method and Conditions
When evenings are unusable, reconsider timing instead of mechanically imposing the evening example. Bennett suggests doing the chosen pursuit before the working day and arranging materials beforehand. Preserve his acknowledgement that some suggestions may not fit exhausted workers.

## Worked Example from the Source
The author describes preparing a tray, tea materials, and a small stove the night before to reduce morning friction. The transferable idea is preparation. The particular equipment and domestic arrangements are historical; they are not a modern recommendation.

## Limits
The preface also argues that people often sleep too much and proposes rising one to two hours earlier. Preserve this as a historical claim, not as established health advice. This skill does not determine anyone's sleep requirement, diagnose fatigue, or substantiate treatment of anxiety. Any user-specific plan must respect the user's actual constraints; a new lunch-break plan is our adaptation, not a schedule in the book.

## Key Takeaways
Recognize genuine fatigue. Consider a different existing opportunity. Prepare materials. Do not obtain productivity claims by silently erasing qualifications or converting dated opinion into medical authority.

## Connects To
- ch04 and ch05: the office-worker and evening examples that need this qualification.
- ch06 and ch12: slack and a sustainable programme.

## Source
[Bundled source](../source.txt), PREFACE TO THIS EDITION, before CONTENTS.
'''
(OUT/'chapters/ch00-preface.md').write_text(preface)
index='\n'.join(f"| [ch{x['chapter']:02d}]({x['file']}) | {x['title']} | {chapters[x['chapter']-1][-1]} |" for x in source_map)
master='''---
name: bennett-time
description: "Apply Arnold Bennett's methods for a realistic learning routine, protected study time, reflective reading, and reducing an overloaded programme; reference How to Live on 24 Hours a Day."
---

# How to Live on 24 Hours a Day

**Author:** Arnold Bennett. **Coverage:** 12 chapters plus preface. **Generated:** 2026-10-07 UTC. **Edition:** Project Gutenberg ebook 2274. This is a compact study example generated by the current Codex agent following book-to-skill; the Python extractor did not write these notes.

## How to Use

- For a practical task, identify the user's actual constraints, choose relevant chapters from the index, and read those files before giving specific advice.
- For a chapter request, load that chapter. For a browse request, show the index.
- Use [cheatsheet.md](cheatsheet.md) for decision rules, [patterns.md](patterns.md) for methods, and [glossary.md](glossary.md) for terms.
- Distinguish source methods from a new application. Cite chapters and preserve conditions, counterexamples, and historical limits.
- Do not force this book onto unrelated questions. It cannot diagnose technical systems or provide medical evidence.

## Core Methods

**Time as a daily budget (I).** Start with existing time and explicit trade-offs; waiting for an expanded day is not a plan. A fresh interval remains available after an earlier one was wasted.

**A small beginning (III, XII).** Expect effort and interruption. Prefer an achievable first success to a dramatic failure. No precise universal minimum session length is supplied.

**A day within a day (IV).** Give life outside paid work deliberate status. The sixteen-hour example is a clock interval that includes sleep, not an entitlement to sixteen hours of additional work.

**A protected appointment (V).** Treat a chosen pursuit as seriously as a social engagement. Bennett's example is ninety minutes on three evenings; adapt only after checking available time and fatigue.

**Remember human nature (VI).** Allow more elapsed time than the task itself needs. His ninety-minute task is allowed a 9–11:30 window. Optional extra effort is a windfall, not a new obligation. His sample programme totals seven and a half hours weekly, with one formally unprogrammed day in the average case.

**Concentrate, then reflect (VII, VIII).** Repeatedly return to a chosen subject; use reflection to compare recent conduct with principles. This is the author's practical approach, not a clinical treatment claim.

**Study what actually interests you (IX, X, XII).** Literature is optional. Arts, work, and ordinary surroundings can sustain systematic inquiry.

**Read with thought (XI).** Bound the topic and time horizon. In the source's ninety-minute study example, at least forty-five minutes goes to reflection. Avoid turning that example into a validated formula for all learners.

**Respect the programme without worshipping it (XII).** Overload calls for less in the plan. A five-minute transition is a palliative when the overloaded plan is unchanged, not the fundamental cure.

**Fatigue qualifies the schedule (preface).** The author acknowledges genuinely exhausted workers and suggests changing timing. His accompanying claims about sleep are historical opinions; this skill does not establish sleep requirements or health outcomes.

## Chapter Index

| Chapter | Title | Topics |
|---|---|---|
| [ch00](chapters/ch00-preface.md) | Preface | Genuine fatigue; timing; historical limits |
'''+index+'''

## Topic Index

- Attention or wandering thoughts: ch07, ch08.
- Beginning a learning routine: ch03, ch06, ch12.
- Books read without retention: ch11, ch08.
- Burnout or evening fatigue: ch00, ch06; this is not clinical guidance.
- Causal curiosity or an uninteresting job: ch10.
- Changing family plans or rigid schedules: ch12.
- Interests outside literature: ch02, ch09, ch10.
- Protected learning time: ch04, ch05, ch06.
- Too much haste: ch12; preserve cure versus palliative.

## Provenance and Limits

The full public-domain [source text](source.txt), including its Gutenberg license, is bundled. [Source map](source-map.json) records chapter line ranges and source hash. Chapter detection returned zero, so the agent mapped twelve standalone Roman-numeral headings and the preface against the actual text. This recovery is explicit, not an automatic extractor result.

No page count is invented for a text file. Notes are deliberately compact because the chapters are short. Descriptive method labels are not asserted to be formal named frameworks invented by Bennett. Historical assumptions about work, household labor, leisure, science, and health limit transfer. When adapting a schedule or adding a contemporary technique, identify that addition as an adaptation.
'''
(OUT/'SKILL.md').write_text(master)
(OUT/'glossary.md').write_text('''# Glossary

- **Daily budget of time:** The fixed span to allocate among life's activities, unlike money that may be increased (I).
- **Day within a day:** Deliberate recognition of life outside paid working hours (IV).
- **Formal programme / super-programme:** The ordinary obligations and chosen additional pursuit distinguished in the book (II, VI).
- **Mental concentration:** Selecting a subject and returning thought to it as it wanders (VII).
- **Palliative:** A temporary easing of pressure, distinguished from reducing an overloaded programme (XII).
- **Reflective mood:** Examining principles, conduct, and future action (VIII).
- **Serious reading:** Bennett's demanding, reflective study practice; his literary hierarchy is an opinion (XI).
- **Windfall:** Optional extra effort that does not become the regular minimum (VI).
''')
(OUT/'patterns.md').write_text('''# Patterns

These are descriptive labels for source methods, not newly attributed formal frameworks.

## Start small and leave room
**When:** An ambitious routine repeatedly fails at the beginning (III, VI, XII).
**How:** Select one wanted pursuit; choose a modest undertaking; reserve interruption room; complete it before increasing the ambition.
**Trade-offs:** Early output is smaller. The objective is a sustainable start, not instant volume.

## Protect an appointment
**When:** A chosen activity repeatedly loses to casual diversions (V).
**How:** Give it a definite interval and the standing of a real engagement. Keep other parts of life in the plan. Read the fatigue qualification in the preface.
**Trade-offs:** Time must come from somewhere. The source's ninety-minute example is not universal.

## Read and reflect within a boundary
**When:** Many completed books produce little understanding (XI).
**How:** Bound a subject, period, or author; set a study horizon; allocate deliberate reflection within reading sessions; accept slower reading.
**Trade-offs:** Fewer pages; greater sustained attention. The chapter's forty-five minutes of reflection belongs to its ninety-minute example.

## Rebuild an oppressive programme
**When:** Life feels like rushing to the next scheduled activity (XII).
**How:** Examine whether the plan attempts too much; reduce it; retain reasonable elasticity. Distinguish the optional five-minute calm transition from the underlying cure.
**Trade-offs:** Some ambitions must be postponed. Tiny pauses cannot make an overflowing commitment list fit.

## Learn through a familiar interest
**When:** Abstract or literary study is unappealing (IX, X).
**How:** Start from music, work, nature, or another real interest; learn its elements; observe with that knowledge; pursue a bounded question.
**Trade-offs:** Narrower initial coverage; deeper connection with actual curiosity.
''')
(OUT/'cheatsheet.md').write_text('''# Decision Cheatsheet

| Situation | Decision | Reason / source |
|---|---|---|
| Waiting until there is more time | Inspect current commitments and begin with a real interval | Fixed time budget; fresh next interval, I and III |
| Early enthusiasm creates a giant plan | Reduce the first commitment and allow accidents | Protect confidence with an achievable start, III |
| Evenings are genuinely exhausted | Reconsider timing and constraints | The preface qualifies the evening example; do not prescribe sleep reduction |
| Study gets displaced by casual diversions | Give a suitable interval the standing of an appointment | V, subject to fatigue and availability |
| Every unusually productive week raises the minimum | Treat extra effort as a windfall | VI |
| Reading many books but retaining little | Narrow the subject and make time to reflect | XI |
| The plan creates constant haste | Attempt less; rebuild the plan | XII; five-minute transitions are only a palliative |
| The subject feels prestigious but uninteresting | Start with genuine taste | IX, X, XII |
| Advice needs a clinical guarantee or a technical diagnosis | State that this source cannot establish it | Scope limit |

**Source numbers, not universal prescriptions:** Three ninety-minute evenings plus six half-hour mornings = 7.5 hours/week (VI). Allow 9–11:30 for a ninety-minute task (VI). At least forty-five minutes of reflection in a ninety-minute study session (XI). A five-minute deliberate transition may ease an oppressive programme without curing overload (XII).
''')
(OUT/'source-map.json').write_text(json.dumps({'source_url':'https://www.gutenberg.org/ebooks/2274','sha256':hashlib.sha256((OUT/'source.txt').read_bytes()).hexdigest(),'line_convention':'UTF-8 decoded with universal newlines; 1-based','chapters':source_map,'preface':'PREFACE TO THIS EDITION before CONTENTS','chapter_mapping':'Agent-assisted, after extractor reported zero chapters'},indent=2)+'\n')
print('Generated',len(list(OUT.rglob('*.*'))),'files at',OUT)

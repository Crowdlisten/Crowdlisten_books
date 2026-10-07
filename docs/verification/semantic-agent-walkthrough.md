# Host-agent walkthrough

Performed by the same Codex agent implementing the prototype, not an independent evaluator. Model retrieval receipts are in `semantic-retrieval-smoke.json`; installed runtime checks are in `semantic-installed-acceptance.json`.

## A useful Chinese question

Question: 如何养成每天运动的习惯？

The semantic matcher ranked **Atomic Habits** first. The agent selected it because the requested outcome is repeated behavior, and the catalog identifies cues, friction, identity, and habit stacking as the book's methods. The scope is establishing a routine, not designing a clinical or athletic training program.

The agent then called `ask` with the returned `atomic-habits` ID and the original Chinese question. The saved editorial digest contains cue/craving/response/reward, the four laws, environment design, the two-minute rule, habit stacking, tracking, and recovery after a lapse. The legacy lexical engine's language notice did not prevent reading that explicitly selected source.

An applied response from that evidence:

> 先把目标缩小到“稳定地开始”。选一个每天都会发生的触发点，例如收拾完晚饭餐具后，穿上提前放好的运动鞋，开始两分钟适合自己的轻活动。完成后做个简单记录。先让开始变得容易，再逐步增加内容。两分钟是建立习惯的起点，不是完整的训练方案。
>
> 这个具体安排是对《原子习惯》中习惯叠加、降低摩擦和两分钟规则的应用；不是书里为你规定的运动计划。依据：已保存的《原子习惯》编辑摘要。

The example schedule is the agent's application. The cited methods come from the digest; no claim is made to have read the original full book.

## A high-similarity result to reject

Question: Should I move to Mars?

The embedding model returned neighbors such as **Seeing Like a State** and **The Structure of Scientific Revolutions**. Their indexed scopes concern planning and paradigms, not the feasibility or conditions of living on Mars. The agent rejects the entire shortlist for this question. A generic metaphor about change is not sufficient source support for the requested decision.

Response: The current shelf does not provide a relevant source for deciding whether to live on Mars. No book-grounded recommendation is warranted from these candidates.

This is why the matcher returns `needs_reasoning`, not `hit` or an answer. Vector scores alone did not achieve abstention.

## Upstream reference navigation

Question: I only need one answer from a long manual. How do I avoid reopening everything?

The generated PD-00 trial skill routes this intent to `chapters/ch02-retrieval.md`, although the question does not use the chapter title. The selected chapter says to consult the contents, open the relevant chapter, and avoid unrelated chapters. The agent can therefore recommend targeted reading followed by chapter-evidence verification, without claiming measured token savings from this tiny fixture.

#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const workspaceRoot = resolve(appRoot, '..', '..', '..');
const defaultInput = resolve(
  workspaceRoot,
  'knowledge/prototypes/outcome_loop_packs/out/app_handoffs/answer_with_books/crowdlisten_handoff.json',
);
const input = getArg('--input') ?? defaultInput;
const queueOutput = resolve(appRoot, 'research/crowdlisten-handoff-queue.json');
const digestOutput = resolve(appRoot, 'research/digest-briefs.json');
const signalOutput = resolve(appRoot, 'research/crowdlisten-signal-opportunity.json');
const passageLedgerOutput = resolve(appRoot, 'research/crowdlisten-passage-ledger.json');

const handoff = JSON.parse(await readFile(input, 'utf8'));
if (handoff.vertical !== 'answer_with_books') {
  throw new Error(`Expected answer_with_books handoff, got ${handoff.vertical}`);
}

const answerBriefCandidates = handoff.action_queue
  .filter((action) => action.action_type === 'create_answer')
  .map((action) => ({
    id: action.action_id,
    title: action.title.replace(/^Draft answer:\s*/i, ''),
    source_action_id: action.action_id,
    source_context_pack_id: handoff.context_pack.id,
    format: action.execution_payload?.body?.format ?? 'how_to_guide',
    audience: action.execution_payload?.body?.audience ?? null,
    concern_id: action.execution_payload?.body?.concern_id ?? action.required_context?.[0]?.id ?? null,
    user_problem: action.required_context?.[0]?.concern ?? action.why_now,
    books: action.execution_payload?.body?.books ?? action.required_context?.[0]?.matched_books ?? [],
    source_ids: action.execution_payload?.body?.sources ?? action.required_context?.map((item) => item.id) ?? [],
    output_contract: action.output_contract,
    quality_gate: action.quality_gate,
    writeback_required: action.writeback_required,
  }));

const digestBriefs = handoff.action_queue
  .filter((action) => action.action_type === 'create_personalized_digest')
  .map((action) => ({
    id: action.action_id,
    title: action.title,
    source_context_pack_id: handoff.context_pack.id,
    target_asset: action.target_asset,
    audience: action.execution_payload?.body?.audience ?? null,
    formats: action.execution_payload?.body?.format ?? [],
    concern_ids: action.execution_payload?.body?.concern_ids ?? action.required_context?.map((item) => item.id) ?? [],
    book_lenses: action.execution_payload?.body?.book_lenses ?? [],
    required_context: action.required_context,
    output_contract: action.output_contract,
    quality_gate: action.quality_gate,
    writeback_required: action.writeback_required,
  }));

const queue = {
  generated_at: handoff.generated_at,
  source: input,
  context_pack_id: handoff.context_pack.id,
  signal_opportunity: handoff.signal_opportunity,
  supply_ledger: handoff.supply_ledger,
  answer_brief_candidates: answerBriefCandidates,
  digest_briefs: digestBriefs,
  next_recommendations: handoff.next_recommendations,
  writeback_contract: handoff.writeback_contract,
};

await mkdir(dirname(queueOutput), { recursive: true });
await writeFile(queueOutput, `${JSON.stringify(queue, null, 2)}\n`);
await writeFile(
  digestOutput,
  `${JSON.stringify({ generated_at: handoff.generated_at, source: input, briefs: digestBriefs }, null, 2)}\n`,
);
await writeFile(
  signalOutput,
  `${JSON.stringify({ generated_at: handoff.generated_at, source: input, signal_opportunity: handoff.signal_opportunity }, null, 2)}\n`,
);
await writeFile(
  passageLedgerOutput,
  `${JSON.stringify({ generated_at: handoff.generated_at, source: input, supply_ledger: handoff.supply_ledger }, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      answer_brief_candidates: answerBriefCandidates.length,
      digest_briefs: digestBriefs.length,
      source_evidence_strength: handoff.signal_opportunity?.source_evidence_strength ?? null,
      passage_ledger_entries: handoff.supply_ledger?.entry_count ?? 0,
      queue_output: queueOutput,
      digest_output: digestOutput,
      signal_output: signalOutput,
      passage_ledger_output: passageLedgerOutput,
    },
    null,
    2,
  ),
);

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

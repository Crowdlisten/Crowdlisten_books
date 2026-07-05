#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const queueInput = getArg('--input') ?? resolve(appRoot, 'research/crowdlisten-handoff-queue.json');
const outputDir = resolve(appRoot, 'research/generated-drafts/crowdlisten');

const queue = JSON.parse(await readFile(queueInput, 'utf8'));
await mkdir(outputDir, { recursive: true });

const written = [];
for (const brief of queue.answer_brief_candidates ?? []) {
  const path = resolve(outputDir, `${slugify(brief.title)}.md`);
  await writeFile(path, renderAnswerDraft(brief, queue));
  written.push(path);
}

for (const brief of queue.digest_briefs ?? []) {
  const path = resolve(outputDir, `${slugify(brief.title)}.md`);
  await writeFile(path, renderDigestDraft(brief, queue));
  written.push(path);
}

console.log(JSON.stringify({ drafts: written.length, output_dir: outputDir }, null, 2));

function renderAnswerDraft(brief, queue) {
  const books = brief.books ?? [];
  const sourceIds = brief.source_ids ?? [];
  return [
    `# ${brief.title}`,
    '',
    `Source action: \`${brief.source_action_id}\``,
    `Context pack: \`${queue.context_pack_id}\``,
    `Status: review_only_draft`,
    '',
    '## User Problem',
    '',
    brief.user_problem ?? 'No user problem captured.',
    '',
    '## Book Lenses',
    '',
    ...(books.length ? books.map((book) => `- \`${book}\``) : ['- Needs book match']),
    '',
    '## Source Signals',
    '',
    ...(sourceIds.length ? sourceIds.map((id) => `- \`${id}\``) : ['- No source IDs captured']),
    '',
    '## Draft Shape',
    '',
    '- Start with the practical question in plain language.',
    '- Use each book as an operating lens, not a generic summary.',
    '- Give a short answer and a practical checklist.',
    '- End with the next measurable outcome or follow-up question.',
    '',
    '## Quality Gate',
    '',
    ...(brief.quality_gate ?? []).map((gate) => `- ${gate}`),
    '',
    '## Writeback Required',
    '',
    ...(brief.writeback_required ?? []).map((field) => `- \`${field}\``),
    '',
  ].join('\n');
}

function renderDigestDraft(brief, queue) {
  return [
    `# ${brief.title}`,
    '',
    `Context pack: \`${queue.context_pack_id}\``,
    `Status: review_only_draft`,
    '',
    '## Audience',
    '',
    brief.audience ?? 'No audience captured.',
    '',
    '## Formats',
    '',
    ...(brief.formats ?? []).map((format) => `- \`${format}\``),
    '',
    '## Concern Sequence',
    '',
    ...(brief.required_context ?? []).map((item) => `- \`${item.id}\` ${item.title}: ${item.concern}`),
    '',
    '## Book Lenses',
    '',
    ...(brief.book_lenses ?? []).map((book) => `- \`${book}\``),
    '',
    '## Draft Shape',
    '',
    '1. Open with the shared anxiety behind the concern sequence.',
    '2. Give one short book-grounded lens per segment.',
    '3. Make the narration readable aloud without restructuring.',
    '4. End with the next answer recommendation.',
    '',
    '## Writeback Required',
    '',
    ...(brief.writeback_required ?? []).map((field) => `- \`${field}\``),
    '',
  ].join('\n');
}

function slugify(value) {
  return String(value ?? 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96) || 'untitled';
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

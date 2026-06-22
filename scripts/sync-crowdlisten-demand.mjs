#!/usr/bin/env node

const input = getArg('--input');
const apiBase = getArg('--api') ?? 'http://127.0.0.1:8787';

if (!input) {
  console.error('usage: npm run sync:crowdlisten -- --input path/to/crowdlisten-demand.json [--api http://127.0.0.1:8787]');
  process.exit(1);
}

const payload = await readJson(input);
const response = await fetch(`${apiBase.replace(/\/$/, '')}/v1/crowdlisten/sync`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});

const body = await response.json();
if (!response.ok) {
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(`synced ${body.concerns?.length ?? 0} concerns and ${body.signals?.length ?? 0} signals`);
for (const concern of body.concerns ?? []) {
  console.log(`- ${concern.id}: ${concern.title}`);
}

async function readJson(path) {
  const fs = await import('node:fs/promises');
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

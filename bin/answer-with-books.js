#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  printHelp();
  process.exit(0);
}

const command = args[0];

if (command !== 'install') {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

const flags = new Set(args.slice(1).filter((arg) => arg.startsWith('--')));
const installSkill = flags.has('--skill') || (!flags.has('--skill') && !flags.has('--api'));
const installApi = flags.has('--api') || (!flags.has('--skill') && !flags.has('--api'));
const cwd = process.cwd();
const codexHome = resolve(process.env.CODEX_HOME || join(homedir(), '.codex'));
const installed = [];

if (installSkill) {
  const source = join(packageRoot, 'skill', 'answer-with-books', 'SKILL.md');
  if (!existsSync(source)) {
    console.error(`Missing skill source: ${source}`);
    process.exit(1);
  }

  const targetDir = join(codexHome, 'skills', 'answer-with-books');
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, 'SKILL.md'), readFileSync(source, 'utf8'));
  installed.push(`skill -> ${targetDir}`);
}

if (installApi) {
  const configDir = join(cwd, '.answer-with-books');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, 'api.json'),
    JSON.stringify(
      {
        name: 'answer-with-books',
        baseUrl: process.env.ANSWER_WITH_BOOKS_API_URL || 'http://127.0.0.1:8787',
        startCommand: 'npm run dev',
        endpoints: {
          health: '/health',
          sources: '/v1/sources',
          queryAnswer: '/v1/answers/query',
          retrieveBooks: '/v1/books/retrieve',
          clickedQuestion: '/v1/signals/clicked-question',
          topOfMind: '/v1/signals/top-of-mind',
        },
      },
      null,
      2
    )
  );
  installed.push(`api config -> ${configDir}/api.json`);
}

console.log('Answer with Books installed.');
for (const item of installed) console.log(`- ${item}`);
console.log('Start the local API with: npm run dev');

function printHelp() {
  console.log(`Answer with Books CLI

Usage:
  npx answer-with-books install --skill --api

Options:
  --skill   Install the agent skill into $CODEX_HOME/skills/answer-with-books
  --api     Write .answer-with-books/api.json in the current project
  --help    Show this help text
`);
}

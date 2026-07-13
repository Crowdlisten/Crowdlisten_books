#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let localApp;

if (args.includes('--help') || args.length === 0) {
  printHelp();
  process.exit(0);
}

const command = args[0];

if (command === 'install') {
  install(args.slice(1));
} else if (command === 'ask') {
  await ask(args.slice(1));
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function install(installArgs) {
  const flags = new Set(installArgs.filter((arg) => arg.startsWith('--')));
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
            ask: '/v1/ask',
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
}

async function ask(askArgs) {
  const { values, positionals } = parseArgs(askArgs);
  const question = positionals.join(' ').trim();
  if (!question) {
    console.error('Missing question.');
    console.error('Example: answer-with-books ask "Am I validating this idea or collecting compliments?"');
    process.exit(1);
  }

  const config = readApiConfig();
  const baseUrl = String(values.apiUrl ?? process.env.ANSWER_WITH_BOOKS_API_URL ?? config.baseUrl ?? 'http://127.0.0.1:8787')
    .replace(/\/$/, '');
  const sources = normalizeList(values.sources ?? values.source) ?? ['books', 'top_of_mind', 'clicked_questions'];
  const topOfMind = normalizeList(values.topOfMind);
  const payload = {
    question,
    sources,
    top_of_mind: topOfMind ?? [],
    format: values.format ?? 'article',
    audience: values.audience ?? 'operator with this top-of-mind question',
    generate_if_missing: values.generate !== 'false',
    compact: values.full !== true,
  };

  try {
    if (topOfMind?.length) {
      await requestJson(baseUrl, config.endpoints?.topOfMind ?? '/v1/signals/top-of-mind', { items: topOfMind });
    }

    const result = await requestJson(baseUrl, config.endpoints?.ask ?? '/v1/ask', payload);
    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    printAskResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not ask the books: ${message}`);
    console.error(`Start the API first, or pass --api-url. Expected API: ${baseUrl}`);
    process.exit(1);
  }
}

async function requestJson(baseUrl, path, body) {
  try {
    return await postJson(`${baseUrl}${path}`, body);
  } catch (error) {
    const target = new URL(baseUrl);
    const isLocal = target.hostname === '127.0.0.1' || target.hostname === 'localhost';
    const isUnavailable = /ECONNREFUSED|fetch failed|socket hang up/i.test(error instanceof Error ? error.message : String(error));
    if (!isLocal || !isUnavailable) throw error;
    return localPost(path, body);
  }
}

async function localPost(path, body) {
  if (!localApp) {
    const { createApp } = await import('../src/app.js');
    localApp = createApp();
  }
  const req = Readable.from([JSON.stringify(body)]);
  req.method = 'POST';
  req.url = path;
  const response = await localApp.route(req);
  const payload = response.body ? JSON.parse(response.body) : {};
  if (response.status < 200 || response.status >= 300) {
    throw new Error(payload.error ?? `Local API returned ${response.status}`);
  }
  return payload;
}

function readApiConfig() {
  const path = join(process.cwd(), '.answer-with-books', 'api.json');
  if (!existsSync(path)) {
    return {
      baseUrl: 'http://127.0.0.1:8787',
      endpoints: {
        ask: '/v1/ask',
        queryAnswer: '/v1/answers/query',
        topOfMind: '/v1/signals/top-of-mind',
      },
    };
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function postJson(url, body) {
  const target = new URL(url);
  const data = JSON.stringify(body);
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise((resolvePromise, reject) => {
    const req = transport(
      target,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(data),
          connection: 'close',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            const payload = text ? JSON.parse(text) : {};
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(payload.error ?? `${res.statusCode} ${res.statusMessage}`));
              return;
            }
            resolvePromise(payload);
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on('error', reject);
    req.end(data);
  });
}

function printAskResult(result) {
  const answers = result.objects?.answers ?? result.answers ?? [];
  const books = result.objects?.books ?? result.books ?? [];
  const newQuestion = result.objects?.new_question ?? result.new_question;

  console.log(`Question: ${result.question}`);
  console.log(`Retrieval status: ${result.status}`);
  if (result.next_step) console.log(`Next step: ${result.next_step}`);
  console.log('');

  if (answers.length) {
    console.log('Existing answers:');
    for (const match of answers.slice(0, 3)) {
      const answer = match.answer ?? match.content;
      console.log(`- ${answer.title ?? answer.question} (${answer.url ?? answer.id})`);
    }
    console.log('');
  }

  if (books.length) {
    console.log('Books:');
    for (const match of books.slice(0, 5)) {
      const book = match.book;
      const detail = [book.author, book.one_liner ?? book.read_if].filter(Boolean).join(' — ');
      console.log(`- ${book.title}${detail ? ` — ${detail}` : ''}`);
    }
    console.log('');
  }

  if (newQuestion) {
    console.log(`New question: ${newQuestion.question}`);
  }
}

function printBooks(matches) {
  const books = matches.map((match) => match.book).filter(Boolean);
  if (!books.length) return;
  console.log(`Answered with: ${books.map((book) => book.title).join(', ')}`);
}

function parseArgs(input) {
  const values = {};
  const positionals = [];
  for (let index = 0; index < input.length; index += 1) {
    const arg = input[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = input[index + 1];
    if (inlineValue !== undefined) {
      values[key] = inlineValue;
    } else if (next && !next.startsWith('--')) {
      values[key] = next;
      index += 1;
    } else {
      values[key] = true;
    }
  }
  return { values, positionals };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (!value || value === true) return null;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function printHelp() {
  console.log(`Answer with Books CLI

Usage:
  npx answer-with-books install --skill --api
  answer-with-books ask "Am I validating this idea or collecting compliments?"

Options:
  --skill   Install the agent skill into $CODEX_HOME/skills/answer-with-books
  --api     Write .answer-with-books/api.json in the current project
  --api-url Override the local Answer with Books API URL for ask
  --sources Optional comma-separated retrieval sources
  --top-of-mind Add comma-separated personal context before asking
  --json    Print the raw API response for ask
  --full    Include full legacy answer bodies in --json output
  --help    Show this help text
`);
}

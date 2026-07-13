import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createApp } from '../src/app.js';

const tempRoot = mkdtempSync(join(tmpdir(), 'awb-skill-e2e-'));
let server;

try {
  const codexHome = join(tempRoot, 'codex-home');
  const install = spawnSync(
    process.execPath,
    [new URL('../bin/answer-with-books.js', import.meta.url).pathname, 'install', '--skill', '--api'],
    {
      cwd: tempRoot,
      env: { ...process.env, CODEX_HOME: codexHome },
      encoding: 'utf8',
    }
  );

  assert.equal(install.status, 0, install.stderr || install.stdout);
  assert.match(install.stdout, /Answer with Books installed/);

  const skill = readFileSync(join(codexHome, 'skills', 'answer-with-books', 'SKILL.md'), 'utf8');
  assert.match(skill, /Thin Harness Contract/);
  assert.match(skill, /Answer URL Contract/);
  assert.match(skill, /900–1,500 word personalized digest/);
  assert.match(skill, /Do not ask the user to repeat context that is already available/);
  assert.match(skill, /POST \/v1\/ask/);
  assert.match(skill, /books.*answers.*new_question/s);

  const apiConfig = JSON.parse(readFileSync(join(tempRoot, '.answer-with-books', 'api.json'), 'utf8'));
  assert.equal(apiConfig.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(apiConfig.endpoints.ask, '/v1/ask');
  assert.equal(apiConfig.endpoints.queryAnswer, undefined);

  const app = createApp();
  server = createServer(async (request, response) => {
    const routed = await app.route(request);
    response.writeHead(routed.status, routed.headers);
    response.end(routed.body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const apiUrl = `http://127.0.0.1:${port}`;

  const health = await app.route(req('GET', '/health'));
  assert.equal(health.status, 200);
  assert.equal(parse(health).ok, true);

  const clicked = await app.route(
    req('POST', '/v1/signals/clicked-question', {
      question: 'How to validate an idea without fooling yourself',
    })
  );
  assert.equal(clicked.status, 201);

  const first = await app.route(
    req('POST', '/v1/answers/query', {
      question: 'How should I validate a startup idea using a synthetic skill e2e prompt?',
      sources: ['books', 'clicked_questions', 'top_of_mind'],
      format: 'article',
      audience: 'early-stage founder',
      min_score: 99,
    })
  );
  assert.equal(first.status, 201);
  const generated = parse(first);
  assert.equal(generated.status, 'generated');
  assert.ok(generated.answers[0].content.books.some((book) => book.id === 'the-mom-test'));

  const second = await app.route(
    req('POST', '/v1/answers/query', {
      question: 'How can founders validate a startup idea using a synthetic skill prompt?',
      generate_if_missing: false,
    })
  );
  assert.equal(second.status, 200);
  const cached = parse(second);
  assert.equal(cached.status, 'hit');
  assert.equal(cached.answers[0].content.id, generated.answers[0].content.id);

  const created = await app.route(
    req('POST', '/v1/books/retrieve', {
      query: 'constraint theory bottleneck throughput',
      min_score: 99,
      create_if_missing: true,
      book: {
        title: 'The Goal',
        author: 'Eliyahu M. Goldratt',
        concepts: ['bottlenecks', 'throughput', 'constraints'],
      },
    })
  );
  assert.equal(created.status, 201);
  assert.equal(parse(created).matches[0].book.id, 'the-goal');

  const asked = await runCommand(
    process.execPath,
    [
      new URL('../bin/answer-with-books.js', import.meta.url).pathname,
      'ask',
      'Am I validating this idea or collecting compliments?',
      '--api-url',
      apiUrl,
      '--top-of-mind',
      'testing whether a founder workflow is real',
    ],
    { cwd: tempRoot, env: { ...process.env, CODEX_HOME: codexHome } }
  );
  assert.equal(asked.status, 0, asked.stderr || asked.stdout);
  assert.match(asked.stdout, /Existing answers:|New question:/);
  assert.match(asked.stdout, /Books:/);
  assert.match(asked.stdout, /Retrieval status:/);

  const localFallback = await runCommand(
    process.execPath,
    [
      new URL('../bin/answer-with-books.js', import.meta.url).pathname,
      'ask',
      'How do I validate a startup idea without collecting compliments?',
      '--api-url',
      'http://127.0.0.1:65534',
      '--json',
    ],
    { cwd: tempRoot, env: { ...process.env, CODEX_HOME: codexHome } }
  );
  assert.equal(localFallback.status, 0, localFallback.stderr || localFallback.stdout);
  const fallbackPayload = JSON.parse(localFallback.stdout);
  assert.equal(fallbackPayload.status, 'hit');
  assert.ok(fallbackPayload.objects.answers.length >= 1);

  console.log('Agent skill E2E passed: install command, one-command local fallback, skill file, API config, cache query, and missing-book creation verified.');
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

function req(method, path, body) {
  const stream = Readable.from(body ? [JSON.stringify(body)] : []);
  stream.method = method;
  stream.url = path;
  return stream;
}

function parse(response) {
  return JSON.parse(response.body);
}

function runCommand(command, args, options) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

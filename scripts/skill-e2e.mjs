import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { createApp } from '../src/app.js';

const tempRoot = mkdtempSync(join(tmpdir(), 'awb-skill-e2e-'));

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
  assert.match(skill, /Retrieve or generate an answer/);
  assert.match(skill, /POST \/v1\/answers\/query/);

  const apiConfig = JSON.parse(readFileSync(join(tempRoot, '.answer-with-books', 'api.json'), 'utf8'));
  assert.equal(apiConfig.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(apiConfig.endpoints.queryAnswer, '/v1/answers/query');

  const app = createApp();

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
      question: 'How should I validate a startup idea without collecting compliments?',
      sources: ['books', 'clicked_questions', 'top_of_mind'],
      format: 'article',
      audience: 'early-stage founder',
    })
  );
  assert.equal(first.status, 201);
  const generated = parse(first);
  assert.equal(generated.status, 'generated');
  assert.ok(generated.answers[0].content.books.some((book) => book.id === 'the-mom-test'));

  const second = await app.route(
    req('POST', '/v1/answers/query', {
      question: 'How can founders validate a startup idea without false praise?',
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
      min_score: 3,
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

  console.log('Agent skill E2E passed: install command, skill file, API config, cache query, and missing-book creation verified.');
} finally {
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

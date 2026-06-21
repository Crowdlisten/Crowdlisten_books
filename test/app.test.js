import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createApp } from '../src/app.js';

test('lists default source toggles', async () => {
  const app = createApp();
  const response = await app.route(req('GET', '/v1/sources'));
  const body = parse(response);

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.sources.map((source) => source.id),
    ['books', 'crowdlisten', 'top_of_mind', 'clicked_questions']
  );
});

test('toggles sources and generates a book-grounded content draft', async () => {
  const app = createApp();

  const toggle = await app.route(
    req('POST', '/v1/sources/toggle', {
      enabled: ['books', 'clicked_questions'],
    })
  );
  assert.equal(toggle.status, 200);

  const clicked = await app.route(
    req('POST', '/v1/signals/clicked-question', {
      question: 'How do I know if my startup idea is any good?',
    })
  );
  assert.equal(clicked.status, 201);

  const generated = await app.route(
    req('POST', '/v1/content/generate', {
      question: 'How do I know if my startup idea is any good?',
      format: 'article',
      audience: 'early-stage founder',
    })
  );
  const body = parse(generated);

  assert.equal(generated.status, 201);
  assert.equal(body.content.status, 'draft');
  assert.equal(body.content.source_ids.includes('books'), true);
  assert.match(body.content.body, /Book-grounded answer/);
  assert.ok(body.content.books.length >= 1);
});

test('captures CrowdListen signals for later generation', async () => {
  const app = createApp();

  const synced = await app.route(
    req('POST', '/v1/crowdlisten/sync', {
      signals: ['Founders are asking how to validate ideas without getting polite lies.'],
    })
  );
  assert.equal(synced.status, 201);

  const generated = await app.route(
    req('POST', '/v1/content/generate', {
      question: 'How should founders validate ideas?',
      sources: ['books', 'crowdlisten'],
    })
  );

  const body = parse(generated);
  assert.match(body.content.body, /Founders are asking/);
});

test('queries the answer cache before generating a new answer', async () => {
  const app = createApp();

  const first = await app.route(
    req('POST', '/v1/answers/query', {
      question: 'How do I validate a startup idea?',
      sources: ['books', 'top_of_mind'],
    })
  );
  const generated = parse(first);

  assert.equal(first.status, 201);
  assert.equal(generated.status, 'generated');
  assert.equal(generated.answers.length, 1);

  const second = await app.route(
    req('POST', '/v1/answers/query', {
      question: 'How can founders validate a startup idea?',
      generate_if_missing: false,
    })
  );
  const cached = parse(second);

  assert.equal(second.status, 200);
  assert.equal(cached.status, 'hit');
  assert.equal(cached.answers[0].content.id, generated.answers[0].content.id);
  assert.ok(cached.books.length >= 1);
});

test('retrieves relevant books or creates a missing catalog record', async () => {
  const app = createApp();

  const hit = await app.route(
    req('POST', '/v1/books/retrieve', {
      query: 'customer discovery and startup validation',
    })
  );
  const hitBody = parse(hit);

  assert.equal(hit.status, 200);
  assert.equal(hitBody.status, 'hit');
  assert.equal(hitBody.matches[0].book.id, 'the-mom-test');

  const created = await app.route(
    req('POST', '/v1/books/retrieve', {
      query: 'strategy kernels and diagnosis',
      create_if_missing: true,
      book: {
        title: 'Good Strategy Bad Strategy',
        author: 'Richard Rumelt',
        concepts: ['diagnosis', 'guiding policy', 'coherent action'],
        applications: ['strategy', 'planning'],
      },
    })
  );
  const createdBody = parse(created);

  assert.equal(created.status, 201);
  assert.equal(createdBody.status, 'created');
  assert.equal(createdBody.matches[0].book.id, 'good-strategy-bad-strategy');
});

function req(method, path, body) {
  const stream = Readable.from(body ? [JSON.stringify(body)] : []);
  stream.method = method;
  stream.url = path;
  return stream;
}

function parse(response) {
  return JSON.parse(response.body);
}

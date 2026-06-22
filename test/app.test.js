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
      question: 'How to validate an idea without fooling yourself',
    })
  );
  assert.equal(clicked.status, 201);

  const generated = await app.route(
    req('POST', '/v1/content/generate', {
      question: 'How to validate an idea without fooling yourself',
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

test('ingests CrowdListen demand packets as concerns', async () => {
  const app = createApp();

  const synced = await app.route(
    req('POST', '/v1/crowdlisten/sync', {
      demand_packets: [
        {
          app_id: 'answerwithbooks',
          topic_id: 'career-switch-without-starting-over',
          working_title: 'How to change careers without starting over',
          audience: 'mid-career operator',
          question_cluster: [
            'How do I switch careers without throwing away my experience?',
          ],
          pain: ['career_uncertainty', 'identity_risk'],
          books: ['designing-your-life', 'so-good-they-cant-ignore-you'],
          evidence: [
            {
              platform: 'reddit',
              url: 'https://www.reddit.com/example',
              quote: 'I want to change careers but I do not want to start from zero.',
              engagement: { score: 42, comments: 18 },
            },
          ],
          publish_recommendation: {
            status: 'needs_source_review',
            score: 0.72,
            reason: 'Repeated career-switching demand with clear book fit.',
          },
        },
      ],
    })
  );
  const syncedBody = parse(synced);

  assert.equal(synced.status, 201);
  assert.equal(syncedBody.concerns[0].id, 'career-switch-without-starting-over');
  assert.equal(syncedBody.signals.length, 3);

  const generated = await app.route(
    req('POST', '/v1/content/generate', {
      concern_id: 'career-switch-without-starting-over',
      sources: ['books', 'crowdlisten'],
    })
  );
  const body = parse(generated);

  assert.equal(generated.status, 201);
  assert.equal(body.content.books[0].id, 'designing-your-life');
  assert.match(body.content.body, /change careers/);
});

test('syncs enriched concerns and generates from the matched book lenses', async () => {
  const app = createApp();

  const synced = await app.route(
    req('POST', '/v1/concerns/sync', {
      concerns: [
        {
          id: 'prioritize-without-loudest-voice',
          title: 'How to prioritize when every request sounds urgent',
          audience: 'product leader',
          books: ['good-strategy-bad-strategy', 'the-wisdom-of-crowds'],
          pain_points: ['stakeholder_pressure', 'planning_breakdown'],
          evidence: [
            {
              title: 'How do you prioritize customer requests vs roadmap goals?',
              url: 'https://www.reddit.com/example',
            },
          ],
        },
      ],
    })
  );
  const syncedBody = parse(synced);

  assert.equal(synced.status, 201);
  assert.equal(syncedBody.concerns[0].id, 'prioritize-without-loudest-voice');

  const generated = await app.route(
    req('POST', '/v1/content/generate', {
      concern_id: 'prioritize-without-loudest-voice',
      sources: ['books', 'crowdlisten'],
    })
  );
  const body = parse(generated);

  assert.equal(generated.status, 201);
  assert.equal(body.content.concern_id, 'prioritize-without-loudest-voice');
  assert.equal(body.content.books[0].id, 'good-strategy-bad-strategy');
  assert.match(body.content.body, /prioritize customer requests/);
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
      query: 'rogo herbie drum buffer rope manufacturing novel',
      min_score: 2,
      create_if_missing: true,
      book: {
        title: 'The Goal',
        author: 'Eliyahu M. Goldratt',
        concepts: ['bottlenecks', 'throughput', 'constraints'],
        applications: ['operations', 'process improvement'],
      },
    })
  );
  const createdBody = parse(created);

  assert.equal(created.status, 201);
  assert.equal(createdBody.status, 'created');
  assert.equal(createdBody.matches[0].book.id, 'the-goal');
});

test('uses backend-only book corpus for matching without exposing full text', async () => {
  const app = createApp();

  const hit = await app.route(
    req('POST', '/v1/books/retrieve', {
      query: 'gravity problem prototype conversation odyssey plans',
    })
  );
  const body = parse(hit);

  assert.equal(hit.status, 200);
  assert.equal(body.status, 'hit');
  assert.equal(body.matches[0].book.id, 'designing-your-life');
  assert.equal('knowledge_text' in body.matches[0].book, false);
  assert.equal('knowledge_chunks' in body.matches[0].book, false);
  assert.equal(body.matches[0].book.knowledge_visibility, 'backend_only');
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

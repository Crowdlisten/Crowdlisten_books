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
  assert.match(body.content.body, /What is really going on/);
  assert.match(body.content.body, /The working move/);
  assert.match(body.content.body, /What to watch for/);
  assert.match(body.content.body, /Try this next/);
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
      question: 'How do I validate a startup idea using a synthetic cache-only prompt?',
      sources: ['books', 'top_of_mind'],
      min_score: 99,
    })
  );
  const generated = parse(first);

  assert.equal(first.status, 201);
  assert.equal(generated.status, 'generated');
  assert.equal(generated.answers.length, 1);

  const second = await app.route(
    req('POST', '/v1/answers/query', {
      question: 'How can I validate a startup idea using a synthetic cache prompt?',
      generate_if_missing: false,
    })
  );
  const cached = parse(second);

  assert.equal(second.status, 200);
  assert.equal(cached.status, 'hit');
  assert.equal(cached.answers[0].content.id, generated.answers[0].content.id);
  assert.ok(cached.books.length >= 1);
});

test('asks against published answers, books, and captures new questions', async () => {
  const app = createApp();

  const hit = await app.route(
    req('POST', '/v1/ask', {
      question: 'How do I fix user interviews that are not teaching me anything?',
    })
  );
  const hitBody = parse(hit);

  assert.equal(hit.status, 200);
  assert.equal(hitBody.status, 'hit');
  assert.equal(hitBody.next_step, 'adapt_existing_answer_with_books');
  assert.deepEqual(Object.keys(hitBody.objects), ['books', 'answers', 'new_question']);
  assert.equal(hitBody.answer.type, 'answer');
  assert.equal(hitBody.answer.url, '/answers/how-to-fix-user-interviews-that-are-not-teaching-you-anything/');
  assert.equal(hitBody.answer.books[0].id, 'the-mom-test');
  assert.ok(hitBody.books.some((match) => match.book.id === 'the-mom-test'));
  assert.ok(hitBody.objects.answers.length >= 1);
  assert.ok(hitBody.objects.books.length >= 1);
  assert.equal(hitBody.objects.new_question, null);

  const miss = await app.route(
    req('POST', '/v1/ask', {
      question: 'How should I use books to decide which niche travel guide to write next?',
      top_of_mind: ['building China Travel Made Easy content'],
      answer_min_score: 20,
    })
  );
  const missBody = parse(miss);

  assert.equal(miss.status, 201);
  assert.equal(missBody.status, 'new_question');
  assert.equal(missBody.next_step, 'answer_from_books_and_save_question');
  assert.equal(missBody.answer, null);
  assert.equal(missBody.new_question.type, 'new_question');
  assert.equal(missBody.new_question.status, 'needs_answer');
  assert.equal(missBody.objects.new_question.id, missBody.new_question.id);
  assert.equal(app.store.questions.has(missBody.new_question.id), true);
});

test('returns a compact ask payload for thin harnesses', async () => {
  const app = createApp();

  const response = await app.route(
    req('POST', '/v1/ask', {
      question: 'How do I validate this idea without collecting compliments?',
      top_of_mind: ['testing founder demand'],
      compact: true,
    })
  );
  const body = parse(response);

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body.objects), ['books', 'answers', 'new_question']);
  assert.equal(body.answer, undefined);
  assert.equal(body.answers, undefined);
  assert.equal(body.books, undefined);
  assert.equal(body.objects.answers[0].content, undefined);
  assert.ok(body.objects.answers[0].answer.excerpt.length <= 523);
  assert.equal(body.objects.books[0].book.knowledge_text, undefined);
});

test('matches the value proposition question to its published answer and curated source books', async () => {
  const app = createApp();
  const response = await app.route(
    req('POST', '/v1/ask', {
      question: 'Does this have a differentiated value proposition or is it another summary product?',
      top_of_mind: ['making answers relevant and applicable to real reader problems'],
      compact: true,
    })
  );
  const body = parse(response);

  assert.equal(response.status, 200);
  assert.equal(body.status, 'hit');
  assert.equal(body.objects.answers[0].answer.id, 'answer:how-to-tell-whether-your-value-proposition-is-actually-different');
  assert.deepEqual(
    body.objects.books.map((match) => match.book.id),
    ['good-strategy-bad-strategy', 'the-mom-test', 'made-to-stick']
  );
  assert.equal(body.objects.books.some((match) => match.book.id === 'atomic-habits'), false);
  assert.equal(body.objects.books.some((match) => match.book.id === 'the-effective-executive'), false);
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
      min_score: 99,
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

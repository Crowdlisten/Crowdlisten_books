import { generateContentCandidate, retrieveBooks, retrieveContent } from './generator.js';
import { createStore, makeId } from './store.js';

export function createApp({ store = createStore() } = {}) {
  async function route(req) {
    const url = new URL(req.url, 'http://localhost');
    const method = req.method ?? 'GET';

    try {
      if (method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, service: 'answer-with-books', version: '0.1.0' });
      }

      if (method === 'GET' && url.pathname === '/v1/sources') {
        return json({ sources: [...store.sources.values()] });
      }

      if (method === 'POST' && url.pathname === '/v1/sources/toggle') {
        const body = await readJson(req);
        const enabled = new Set(body.enabled ?? []);
        if (!enabled.size) return problem(400, 'enabled must include at least one source id');
        for (const source of store.sources.values()) source.enabled = enabled.has(source.id);
        return json({ sources: [...store.sources.values()] });
      }

      if (method === 'GET' && url.pathname === '/v1/books') {
        return json({ books: [...store.books.values()] });
      }

      if (method === 'POST' && url.pathname === '/v1/books') {
        const body = await readJson(req);
        if (!body.title || !body.author) return problem(400, 'title and author are required');
        const book = upsertBook(body, store);
        return json({ book }, 201);
      }

      if (method === 'POST' && url.pathname === '/v1/books/retrieve') {
        const body = await readJson(req);
        const query = body.query ?? body.question ?? body.title;
        if (!query) return problem(400, 'query, question, or title is required');
        const matches = retrieveBooks({
          query,
          books: store.books,
          limit: body.limit,
          minScore: body.min_score ?? 1,
        });
        if (matches.length) return json({ status: 'hit', matches });

        if (body.create_if_missing && body.book?.title && body.book?.author) {
          const book = upsertBook(body.book, store);
          return json({ status: 'created', matches: [{ score: 0, book }] }, 201);
        }

        return json({ status: 'miss', matches: [] });
      }

      if (method === 'GET' && url.pathname === '/v1/questions') {
        return json({ questions: [...store.questions.values()] });
      }

      if (method === 'POST' && url.pathname === '/v1/questions') {
        const body = await readJson(req);
        if (!body.question) return problem(400, 'question is required');
        const question = {
          id: makeId('q'),
          question: body.question,
          source_ids: normalizeSources(body.sources, store),
          context: body.context ?? null,
          clicked: Boolean(body.clicked),
          created_at: store.now(),
        };
        store.questions.set(question.id, question);
        if (question.clicked) {
          store.demandSignals.push({
            id: makeId('sig'),
            type: 'clicked_question',
            text: question.question,
            question_id: question.id,
            created_at: store.now(),
          });
        }
        return json({ question }, 201);
      }

      if (method === 'POST' && url.pathname === '/v1/signals/top-of-mind') {
        const body = await readJson(req);
        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) return problem(400, 'items must be a non-empty array');
        const signals = items.map((item) => ({
          id: makeId('sig'),
          type: 'top_of_mind',
          text: String(item),
          created_at: store.now(),
        }));
        store.demandSignals.push(...signals);
        return json({ signals }, 201);
      }

      if (method === 'POST' && url.pathname === '/v1/signals/clicked-question') {
        const body = await readJson(req);
        if (!body.question) return problem(400, 'question is required');
        const signal = {
          id: makeId('sig'),
          type: 'clicked_question',
          text: body.question,
          user_id: body.user_id ?? null,
          created_at: store.now(),
        };
        store.demandSignals.push(signal);
        return json({ signal }, 201);
      }

      if (method === 'GET' && url.pathname === '/v1/content') {
        return json({ content: [...store.content.values()] });
      }

      if (method === 'POST' && url.pathname === '/v1/content/generate') {
        const body = await readJson(req);
        const question = resolveQuestion(body, store);
        if (!question) return problem(400, 'question or question_id is required');
        const sourceIds = normalizeSources(body.sources, store);
        const content = generateAndStoreContent({ question, sourceIds, body, store });
        store.content.set(content.id, content);
        return json({ content }, 201);
      }

      if (method === 'POST' && url.pathname === '/v1/answers/query') {
        const body = await readJson(req);
        const question = resolveQuestion(body, store);
        if (!question) return problem(400, 'question or question_id is required');
        const sourceIds = normalizeSources(body.sources, store);
        const answerMatches = retrieveContent({
          query: question,
          content: store.content,
          limit: body.limit ?? 5,
          minScore: body.min_score ?? 2,
        });
        const bookMatches = retrieveBooks({
          query: question,
          books: store.books,
          limit: body.book_limit ?? 5,
          minScore: body.book_min_score ?? 1,
        });

        if (answerMatches.length) {
          return json({
            status: 'hit',
            question,
            answers: answerMatches,
            books: bookMatches,
          });
        }

        if (body.generate_if_missing === false) {
          return json({
            status: 'miss',
            question,
            answers: [],
            books: bookMatches,
          });
        }

        const content = generateAndStoreContent({ question, sourceIds, body, store });
        store.content.set(content.id, content);
        return json({
          status: 'generated',
          question,
          answers: [{ score: null, content }],
          books: bookMatches,
        }, 201);
      }

      if (method === 'POST' && url.pathname === '/v1/crowdlisten/sync') {
        const body = await readJson(req);
        const signals = normalizeCrowdListenSignals(body).map((signal) => ({
          id: makeId('sig'),
          type: 'crowdlisten',
          text: signal,
          created_at: store.now(),
        }));
        store.demandSignals.push(...signals);
        return json({ signals }, 201);
      }

      return problem(404, 'route not found');
    } catch (error) {
      return problem(500, error instanceof Error ? error.message : 'unknown error');
    }
  }

  return { route, store };
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))).toString('utf8'));
}

function json(payload, status = 200) {
  return {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload, null, 2),
  };
}

function problem(status, message) {
  return json({ error: message }, status);
}

function normalizeSources(input, store) {
  const requested = Array.isArray(input)
    ? input
    : [...store.sources.values()].filter((source) => source.enabled).map((source) => source.id);
  return requested.filter((id) => store.sources.has(id));
}

function resolveQuestion(body, store) {
  if (body.question) return body.question;
  if (body.question_id && store.questions.has(body.question_id)) {
    return store.questions.get(body.question_id).question;
  }
  return null;
}

function upsertBook(body, store) {
  const id = body.id ?? slugify(body.title);
  const existing = store.books.get(id);
  const book = {
    id,
    title: body.title,
    author: body.author,
    concepts: body.concepts ?? existing?.concepts ?? [],
    quotes: body.quotes ?? existing?.quotes ?? [],
    applications: body.applications ?? existing?.applications ?? [],
    created_at: existing?.created_at ?? store.now(),
    updated_at: store.now(),
  };
  store.books.set(id, book);
  return book;
}

function generateAndStoreContent({ question, sourceIds, body, store }) {
  const candidate = generateContentCandidate({
    question,
    books: store.books,
    sourceIds,
    demandSignals: store.demandSignals.filter((signal) => sourceIds.includes(signal.type) || sourceIds.includes('crowdlisten')),
    format: body.format,
    audience: body.audience,
  });
  return {
    id: makeId('content'),
    question,
    status: 'draft',
    cache_key: slugify(question),
    created_at: store.now(),
    ...candidate,
  };
}

function normalizeCrowdListenSignals(body) {
  if (Array.isArray(body.signals)) return body.signals.map(String);
  if (Array.isArray(body.questions)) return body.questions.map(String);
  if (body.analysis?.themes) return body.analysis.themes.map((theme) => theme.title ?? theme.name ?? JSON.stringify(theme));
  return [];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

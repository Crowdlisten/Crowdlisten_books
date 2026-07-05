import { generateContentCandidate, retrieveBooks, retrieveContent } from './generator.js';
import { createStore, makeId } from './store.js';

export function createApp({ store = createStore() } = {}) {
  async function route(req) {
    const url = new URL(req.url, 'http://localhost');
    const method = req.method ?? 'GET';

    try {
      if (method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, service: 'answer-with-books', version: '0.1.2' });
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

      if (method === 'GET' && url.pathname === '/v1/concerns') {
        return json({ concerns: [...store.concerns.values()] });
      }

      if (method === 'POST' && url.pathname === '/v1/concerns/sync') {
        const body = await readJson(req);
        const items = Array.isArray(body.concerns) ? body.concerns : [];
        if (!items.length) return problem(400, 'concerns must be a non-empty array');
        const concerns = items.map((item) => upsertConcern(item, store));
        return json({ concerns }, 201);
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

      if (method === 'POST' && url.pathname === '/v1/ask') {
        const body = await readJson(req);
        const question = resolveQuestion(body, store);
        if (!question) return problem(400, 'question or question_id is required');
        const sourceIds = normalizeSources(body.sources, store);
        const answers = retrieveContent({
          query: question,
          content: store.content,
          limit: body.limit ?? 3,
          minScore: body.answer_min_score ?? 2,
        });
        const books = retrieveBooks({
          query: question,
          books: store.books,
          limit: body.book_limit ?? 5,
          minScore: body.book_min_score ?? 1,
        });
        const answer = answers[0]?.content ?? null;
        const isHit = Boolean(answer);
        const newQuestion = isHit && body.capture_hit !== true
          ? null
          : captureNewQuestion({ question, body, sourceIds, answers, books, store });
        const compact = body.compact === true;
        const objects = {
          books: compact ? books.map(compactBookMatch) : books,
          answers: compact ? answers.map(compactAnswerMatch) : answers,
          new_question: newQuestion,
        };
        const payload = {
          status: isHit ? 'hit' : 'new_question',
          question,
          objects,
          next_step: isHit
            ? 'adapt_existing_answer_with_books'
            : books.length
              ? 'answer_from_books_and_save_question'
              : 'save_question_and_request_source_books',
        };

        if (compact) {
          return json(payload, isHit ? 200 : 201);
        }

        return json({
          ...payload,
          answer,
          answers,
          books,
          new_question: newQuestion,
        }, isHit ? 200 : 201);
      }

      if (method === 'POST' && url.pathname === '/v1/content/generate') {
        const body = await readJson(req);
        const concern = resolveConcern(body, store);
        const question = resolveQuestion(body, store) ?? concern?.title;
        if (!question) return problem(400, 'question, question_id, or concern_id is required');
        const sourceIds = normalizeSources(body.sources, store);
        const content = generateAndStoreContent({ question, concern, sourceIds, body, store });
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
        const concerns = normalizeCrowdListenDemandPackets(body).map((packet) => upsertConcern(packet, store));
        const signals = normalizeCrowdListenSignals(body).map((signal) => ({
          id: makeId('sig'),
          type: 'crowdlisten',
          text: signal,
          created_at: store.now(),
        }));
        store.demandSignals.push(...signals);
        return json({ signals, concerns }, 201);
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

function resolveConcern(body, store) {
  if (body.concern_id && store.concerns.has(body.concern_id)) return store.concerns.get(body.concern_id);
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

function upsertConcern(body, store) {
  const id = body.id ?? slugify(body.title ?? body.question ?? body.concern);
  if (!id) throw new Error('concern id, title, question, or concern is required');
  const existing = store.concerns.get(id);
  const concern = {
    id,
    title: body.title ?? body.question ?? existing?.title,
    concern: body.concern ?? existing?.concern ?? null,
    audience: body.audience ?? existing?.audience ?? null,
    books: body.books ?? existing?.books ?? [],
    pain_points: body.pain_points ?? existing?.pain_points ?? [],
    evidence: body.evidence ?? existing?.evidence ?? [],
    source_fit: body.source_fit ?? existing?.source_fit ?? null,
    publish_recommendation: body.publish_recommendation ?? existing?.publish_recommendation ?? null,
    created_at: existing?.created_at ?? store.now(),
    updated_at: store.now(),
  };
  store.concerns.set(id, concern);
  for (const evidence of concern.evidence.slice(0, 5)) {
    store.demandSignals.push({
      id: makeId('sig'),
      type: 'crowdlisten',
      text: evidence.title ?? evidence.excerpt ?? concern.title,
      concern_id: id,
      url: evidence.url ?? null,
      created_at: store.now(),
    });
  }
  return concern;
}

function generateAndStoreContent({ question, concern, sourceIds, body, store }) {
  const candidate = generateContentCandidate({
    question,
    books: store.books,
    preferredBookIds: body.books ?? concern?.books ?? [],
    sourceIds,
    demandSignals: store.demandSignals.filter((signal) => sourceIds.includes(signal.type) || sourceIds.includes('crowdlisten')),
    format: body.format,
    audience: body.audience ?? concern?.audience,
  });
  return {
    id: makeId('content'),
    question,
    concern_id: concern?.id ?? null,
    status: 'draft',
    cache_key: slugify(question),
    created_at: store.now(),
    ...candidate,
  };
}

function captureNewQuestion({ question, body, sourceIds, answers, books, store }) {
  const captured = {
    id: makeId('newq'),
    type: 'new_question',
    question,
    context: body.context ?? null,
    top_of_mind: body.top_of_mind ?? [],
    source_ids: sourceIds,
    answer_ids: answers.map((match) => match.content.id),
    book_ids: books.map((match) => match.book.id),
    status: answers.length ? 'answered' : 'needs_answer',
    created_at: store.now(),
  };
  store.questions.set(captured.id, captured);
  return captured;
}

function compactBookMatch(match) {
  const book = match.book;
  return {
    score: match.score,
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year ?? null,
      url: book.url ?? null,
      one_liner: book.one_liner ?? null,
      read_if: book.read_if ?? null,
      concepts: (book.concepts ?? []).slice(0, 8),
    },
  };
}

function compactAnswerMatch(match) {
  const answer = match.content;
  return {
    score: match.score,
    answer: {
      id: answer.id,
      title: answer.title ?? answer.question,
      question: answer.question,
      description: answer.description ?? null,
      url: answer.url ?? null,
      excerpt: excerpt(answer.body ?? answer.description ?? '', 520),
      books: answer.books ?? [],
      concepts: answer.concepts ?? [],
    },
  };
}

function excerpt(value, maxLength) {
  const text = String(value)
    .replace(/[#*_`>\-[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}

function normalizeCrowdListenSignals(body) {
  if (Array.isArray(body.demand_packets)) {
    return body.demand_packets.flatMap((packet) => [
      packet.working_title,
      ...(packet.question_cluster ?? []),
      ...(packet.evidence ?? []).map((item) => item.quote ?? item.title ?? item.text),
    ]).filter(Boolean).map(String);
  }
  if (Array.isArray(body.signals)) return body.signals.map(String);
  if (Array.isArray(body.questions)) return body.questions.map(String);
  if (body.analysis?.themes) return body.analysis.themes.map((theme) => theme.title ?? theme.name ?? JSON.stringify(theme));
  if (Array.isArray(body.insights)) return body.insights.map((insight) => insight.title ?? insight.description ?? JSON.stringify(insight));
  return [];
}

function normalizeCrowdListenDemandPackets(body) {
  if (Array.isArray(body.demand_packets)) {
    return body.demand_packets.map(packetToConcern);
  }
  if (Array.isArray(body.concerns)) {
    return body.concerns;
  }
  if (Array.isArray(body.insights)) {
    return body.insights.map((insight) => packetToConcern({
      topic_id: insight.id ?? insight.slug ?? insight.title,
      working_title: insight.title,
      audience: insight.audience,
      pain: [insight.category, insight.urgency].filter(Boolean),
      evidence: (insight.evidence ?? insight.sources ?? insight.snippets ?? []).map((item) =>
        typeof item === 'string' ? { quote: item } : item
      ),
      publish_recommendation: {
        priority: Number(insight.confidence ?? insight.impact_score ?? 0) > 1
          ? Number(insight.impact_score ?? 0) / 100
          : Number(insight.confidence ?? 0.5),
        format: 'how_to_guide',
        reason: insight.description ?? 'CrowdListen synthesized insight.',
      },
    }));
  }
  return [];
}

function packetToConcern(packet) {
  const id = packet.topic_id ?? packet.id ?? slugify(packet.working_title ?? packet.title ?? packet.question ?? '');
  const title = packet.working_title ?? packet.title ?? packet.question ?? id;
  const evidence = (packet.evidence ?? []).map((item) => ({
    title: item.title ?? item.question ?? item.quote ?? item.text ?? title,
    platform: item.platform ?? null,
    subreddit: item.subreddit ?? null,
    url: item.url ?? null,
    published_at: item.published_at ?? item.date ?? null,
    score: item.score ?? item.engagement?.score ?? item.engagement?.likes ?? null,
    comments: item.comments ?? item.engagement?.comments ?? null,
    excerpt: item.excerpt ?? item.quote ?? item.text ?? null,
  }));
  return {
    id,
    title,
    concern:
      packet.user_problem ??
      packet.concern ??
      `People are asking: ${title}`,
    audience: packet.audience ?? 'reader with this problem',
    books: packet.books ?? packet.book_ids ?? packet.source_fit?.matched_books ?? [],
    pain_points: packet.pain ?? packet.pain_points ?? [],
    question_variants: packet.question_cluster ?? packet.question_variants ?? [],
    evidence,
    source_fit: packet.source_fit ?? {
      corpus: 'answer_with_books',
      status: packet.books?.length || packet.book_ids?.length ? 'usable_for_draft' : 'needs_book_match',
      matched_books: packet.books ?? packet.book_ids ?? [],
    },
    publish_recommendation: packet.publish_recommendation ?? {
      status: evidence.length >= 3 ? 'needs_source_review' : 'hold',
      score: evidence.length >= 3 ? 0.55 : 0.3,
      reason: 'Imported from CrowdListen demand synthesis.',
    },
  };
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

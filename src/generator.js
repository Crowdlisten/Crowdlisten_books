const formatLabels = {
  article: 'essay-style answer',
  brief: 'concise briefing',
  script: 'short-form script',
  card: 'visual card copy',
};

const stopwords = new Set([
  'answer',
  'answers',
  'and',
  'are',
  'being',
  'book',
  'books',
  'but',
  'can',
  'could',
  'decide',
  'for',
  'from',
  'get',
  'have',
  'how',
  'into',
  'instead',
  'another',
  'applicable',
  'did',
  'does',
  'had',
  'has',
  'know',
  'make',
  'making',
  'more',
  'need',
  'next',
  'not',
  'product',
  'problem',
  'reader',
  'real',
  'relevant',
  'really',
  'right',
  'should',
  'summary',
  'than',
  'the',
  'their',
  'them',
  'they',
  'this',
  'that',
  'use',
  'using',
  'want',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'whether',
  'with',
  'would',
  'your',
]);

export function selectRelevantBooks({ question, books, limit = 3 }) {
  return [...books.values()]
    .map((book) => {
      const haystack = [book.title, book.author, ...(book.concepts ?? []), ...(book.applications ?? [])]
        .concat([book.knowledge_text ?? ''])
        .join(' ')
        .toLowerCase();
      const score = scoreText(question, haystack);
      return { book, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.book);
}

export function retrieveBooks({ query, books, limit = 5, minScore = 1 }) {
  return [...books.values()]
    .map((book) => {
      const score = scoreDistinctFields(query, [
        { value: book.title, weight: 7 },
        { value: book.author, weight: 3 },
        { value: book.concepts, weight: 6 },
        { value: book.applications, weight: 5 },
        { value: [book.one_liner, book.read_if], weight: 4 },
        { value: book.knowledge_text, weight: 1, cap: 4 },
      ]);
      return { book: publicBook(book), score };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .slice(0, limit)
    .map(({ book, score }) => ({ score, book }));
}

function scoreDistinctFields(query, fields) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return 0;

  const bestWeight = new Map(queryTokens.map((token) => [token, 0]));
  for (const field of fields) {
    const weight = field.weight ?? 1;
    const fieldTokens = new Set(tokenize(Array.isArray(field.value) ? field.value.join(' ') : field.value));
    const matches = queryTokens.filter((token) => fieldTokens.has(token));
    const maxMatches = Number.isFinite(field.cap)
      ? Math.max(0, Math.floor(field.cap / weight))
      : matches.length;
    for (const token of matches.slice(0, maxMatches)) {
      bestWeight.set(token, Math.max(bestWeight.get(token) ?? 0, weight));
    }
  }

  return [...bestWeight.values()].reduce((sum, weight) => sum + weight, 0);
}

function publicBook(book) {
  const {
    knowledge_text,
    knowledge_chunks,
    knowledge_sections,
    ...safeBook
  } = book;
  return safeBook;
}

export function retrieveContent({ query, content, limit = 5, minScore = 2 }) {
  return [...content.values()]
    .map((item) => {
      const anchorScore = scoreFields(query, [
        { value: [item.question, item.title], weight: 1 },
        { value: item.concepts, weight: 1 },
      ]);
      const score = scoreFields(query, [
        { value: [item.question, item.title], weight: 7 },
        { value: item.description, weight: 5 },
        { value: item.concepts, weight: 4 },
        { value: (item.books ?? []).map((book) => `${book.title} ${book.author}`), weight: 2 },
        { value: item.body, weight: 1, cap: 6 },
      ]);
      return { content: item, score, anchorScore };
    })
    .filter((item) => item.anchorScore > 0 && item.score >= minScore)
    .sort((a, b) => b.score - a.score || b.content.created_at.localeCompare(a.content.created_at))
    .slice(0, limit)
    .map(({ content, score }) => ({ score, content }));
}

export function scoreText(query, text) {
  return scoreFields(query, [{ value: text, weight: 1 }]);
}

function scoreFields(query, fields) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return 0;

  return fields.reduce((total, field) => {
    const fieldTokens = new Set(tokenize(Array.isArray(field.value) ? field.value.join(' ') : field.value));
    const raw = queryTokens.reduce(
      (sum, token) => sum + (fieldTokens.has(token) ? (field.weight ?? 1) : 0),
      0
    );
    return total + Math.min(raw, field.cap ?? Number.POSITIVE_INFINITY);
  }, 0);
}

function tokenize(value) {
  return [
    ...new Set(
      String(value ?? '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2 && !stopwords.has(token))
        .map(stem)
        .filter((token) => token.length > 2 && !stopwords.has(token))
    ),
  ];
}

function stem(token) {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function generateContentCandidate({
  question,
  books,
  preferredBookIds = [],
  sourceIds,
  demandSignals,
  format = 'article',
  audience = 'curious reader',
}) {
  const preferred = preferredBookIds.map((id) => books.get(id)).filter(Boolean);
  const selectedBooks = uniqueBooks([
    ...preferred,
    ...selectRelevantBooks({ question, books, limit: Math.max(3, 3 - preferred.length) }),
  ]).slice(0, 3);
  const primary = selectedBooks[0] ?? [...books.values()][0];
  const supporting = selectedBooks.slice(1);
  const signalSummary = summarizeSignals(demandSignals);
  const conceptList = selectedBooks.flatMap((book) => book.concepts ?? []).slice(0, 6);

  const title = question.endsWith('?') ? question : `${question}?`;
  const formatLabel = formatLabels[format] ?? formatLabels.article;
  const audienceLabel = withArticle(audience);

  const body = [
    `# ${title}`,
    '',
    `This ${formatLabel} starts with the live decision facing ${audienceLabel}. The books are evidence and lenses, not the table of contents for a summary.`,
    '',
    `## What is really going on`,
    '',
    `The surface question is asking for an answer, but the useful work is to identify which observable condition should change the decision. ${primary.title} supplies the first diagnostic lens: ${sentenceFromList(primary.concepts)}.`,
    '',
    `## What the books add`,
    '',
    supporting.length
      ? `${primary.title} provides the primary mechanism. ${supporting.map((book) => book.title).join(' and ')} should be used only where they add a competing explanation, a constraint, or a failure mode.`
      : `Stay close to ${primary.title}. One well-fitted mechanism is more useful than several loosely related takeaways.`,
    '',
    `## The working move`,
    '',
    `Write a one-sentence decision rule in this form: "When I observe ___, I will ___ because ___." Fill the first blank with evidence available in the user's situation, the second with the smallest reversible action, and the third with the mechanism from ${primary.title}.`,
    '',
    `## What to watch for`,
    '',
    `A book lens is not proof that it fits this case. Name what evidence would falsify the diagnosis, and omit any supporting book that cannot change the decision.`,
    '',
    `## Try this next`,
    '',
    `Run the smallest action that produces a visible artifact: a written rule, a customer commitment, a calendar change, a decision log, or another signal appropriate to the question. Review that artifact before adding more advice.`,
    '',
    `## Demand evidence`,
    '',
    signalSummary,
  ].join('\n');

  return {
    title,
    format,
    audience,
    source_ids: sourceIds,
    books: selectedBooks.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
    })),
    concepts: conceptList,
    body,
  };
}

function uniqueBooks(items) {
  const seen = new Set();
  return items.filter((book) => {
    if (!book || seen.has(book.id)) return false;
    seen.add(book.id);
    return true;
  });
}

function summarizeSignals(signals) {
  if (!signals.length) {
    return 'No external demand signal was supplied yet. Treat this as a user-stated question and generate the smallest useful answer with clear source grounding.';
  }

  const latest = signals.slice(-5);
  return latest
    .map((signal) => `- ${signal.type}: ${signal.text}`)
    .join('\n');
}

function sentenceFromList(items = []) {
  if (!items.length) return 'the book supplies a durable framework for the question';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function withArticle(value) {
  const label = String(value ?? 'curious reader').trim();
  if (/^(a|an|the)\s/i.test(label)) return label;
  return /^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`;
}

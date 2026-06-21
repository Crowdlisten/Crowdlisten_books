const formatLabels = {
  article: 'essay-style answer',
  brief: 'concise briefing',
  script: 'short-form script',
  card: 'visual card copy',
};

const stopwords = new Set([
  'and',
  'are',
  'but',
  'can',
  'for',
  'from',
  'how',
  'into',
  'the',
  'this',
  'that',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'your',
]);

export function selectRelevantBooks({ question, books, limit = 3 }) {
  return [...books.values()]
    .map((book) => {
      const haystack = [book.title, book.author, ...(book.concepts ?? []), ...(book.applications ?? [])]
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
      const haystack = [
        book.title,
        book.author,
        ...(book.concepts ?? []),
        ...(book.quotes ?? []),
        ...(book.applications ?? []),
      ].join(' ');
      return { book, score: scoreText(query, haystack) };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .slice(0, limit)
    .map(({ book, score }) => ({ score, book }));
}

export function retrieveContent({ query, content, limit = 5, minScore = 2 }) {
  return [...content.values()]
    .map((item) => {
      const haystack = [
        item.question,
        item.title,
        item.body,
        ...(item.concepts ?? []),
        ...(item.books ?? []).map((book) => `${book.title} ${book.author}`),
      ].join(' ');
      return { content: item, score: scoreText(query, haystack) };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score || b.content.created_at.localeCompare(a.content.created_at))
    .slice(0, limit)
    .map(({ content, score }) => ({ score, content }));
}

export function scoreText(query, text) {
  const haystack = String(text ?? '').toLowerCase();
  const tokens = [
    ...new Set(
      String(query ?? '')
        .toLowerCase()
        .split(/\W+/)
        .filter((token) => token.length > 2 && !stopwords.has(token))
    ),
  ];
  return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
}

export function generateContentCandidate({
  question,
  books,
  sourceIds,
  demandSignals,
  format = 'article',
  audience = 'curious reader',
}) {
  const selectedBooks = selectRelevantBooks({ question, books });
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
    `This ${formatLabel} answers the question for ${audienceLabel} by treating books as source material and demand signals as the editorial brief.`,
    '',
    `## Book-grounded answer`,
    '',
    `${primary.title} gives the first lens: ${sentenceFromList(primary.concepts)}. The useful move is to name the mechanism underneath the surface question, then apply the book's framework to the situation people already care about.`,
    '',
    supporting.length
      ? `A second lens comes from ${supporting.map((book) => book.title).join(' and ')}. Together, these sources keep the answer from becoming a generic summary: one book gives the core model, another complicates it, and the final answer becomes usable judgment.`
      : `The answer should stay close to ${primary.title}, using its concepts as the constraint that prevents generic commentary.`,
    '',
    `## Demand signal`,
    '',
    signalSummary,
    '',
    `## Content angle`,
    '',
    `Lead with the user's live problem, then bring in the book. Do not start with a book report. Start with the tension people are already feeling, use the book to make it legible, then end with a practical takeaway.`,
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

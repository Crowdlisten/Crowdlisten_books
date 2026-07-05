import { existsSync, readFileSync } from 'node:fs';

export function createStore() {
  const now = () => new Date().toISOString();

  const books = new Map();
  const questions = new Map();
  const concerns = new Map();
  const content = new Map();
  const demandSignals = [];

  const sources = new Map([
    [
      'books',
      {
        id: 'books',
        label: 'Book source graph',
        enabled: true,
        description: 'Canonical book concepts, quotes, frameworks, stories, and application notes.',
      },
    ],
    [
      'crowdlisten',
      {
        id: 'crowdlisten',
        label: 'CrowdListen demand engine',
        enabled: true,
        description: 'Trending questions, pain points, emotional language, and crowd evidence.',
      },
    ],
    [
      'top_of_mind',
      {
        id: 'top_of_mind',
        label: 'Top-of-mind queue',
        enabled: true,
        description: 'Questions or themes a user explicitly says are important right now.',
      },
    ],
    [
      'clicked_questions',
      {
        id: 'clicked_questions',
        label: 'Clicked question history',
        enabled: true,
        description: 'Questions users clicked into, saved, or expanded.',
      },
    ],
  ]);

  const seedBooks = [
    {
      id: 'the-mom-test',
      title: 'The Mom Test',
      author: 'Rob Fitzpatrick',
      concepts: ['past behavior', 'customer discovery', 'commitments over compliments'],
      quotes: ['Talk about their life instead of your idea.'],
      applications: ['startup validation', 'user interviews', 'feature demand'],
    },
    {
      id: 'thinking-fast-and-slow',
      title: 'Thinking, Fast and Slow',
      author: 'Daniel Kahneman',
      concepts: ['substitution', 'inside view', 'outside view', 'premortem'],
      quotes: ['The confidence people have in their beliefs is not a measure of the quality of evidence.'],
      applications: ['decision making', 'bias detection', 'forecasting'],
    },
    {
      id: 'seeing-like-a-state',
      title: 'Seeing Like a State',
      author: 'James C. Scott',
      concepts: ['legibility', 'local knowledge', 'high-modernist planning'],
      quotes: ['Designed or planned social order is necessarily schematic.'],
      applications: ['policy design', 'operations', 'systems failure'],
    },
    {
      id: 'the-wisdom-of-crowds',
      title: 'The Wisdom of Crowds',
      author: 'James Surowiecki',
      concepts: ['diversity', 'independence', 'decentralization', 'aggregation'],
      quotes: ['The best collective decisions are the product of disagreement and contest.'],
      applications: ['team decisions', 'forecasting', 'feedback aggregation'],
    },
    {
      id: 'the-structure-of-scientific-revolutions',
      title: 'The Structure of Scientific Revolutions',
      author: 'Thomas S. Kuhn',
      concepts: ['paradigms', 'normal science', 'anomalies', 'crisis'],
      quotes: ['The decision to reject one paradigm is always simultaneously the decision to accept another.'],
      applications: ['pivots', 'research strategy', 'technical direction'],
    },
    {
      id: 'good-strategy-bad-strategy',
      title: 'Good Strategy Bad Strategy',
      author: 'Richard Rumelt',
      concepts: ['diagnosis', 'guiding policy', 'coherent action', 'strategy kernel'],
      quotes: [],
      applications: ['strategy', 'planning', 'management'],
    },
    {
      id: 'the-lean-startup',
      title: 'The Lean Startup',
      author: 'Eric Ries',
      concepts: ['validated learning', 'build-measure-learn', 'minimum viable product', 'pivot or persevere'],
      quotes: [],
      applications: ['startup experiments', 'product validation', 'MVP design'],
    },
    {
      id: 'dont-make-me-think',
      title: "Don't Make Me Think",
      author: 'Steve Krug',
      concepts: ['scanning', 'self-evident design', 'usability testing', 'conventions'],
      quotes: [],
      applications: ['web design', 'landing pages', 'onboarding'],
    },
    {
      id: 'made-to-stick',
      title: 'Made to Stick',
      author: 'Chip Heath and Dan Heath',
      concepts: ['curse of knowledge', 'simple', 'unexpected', 'concrete', 'credible', 'emotional', 'stories'],
      quotes: [],
      applications: ['positioning', 'copywriting', 'communication'],
    },
    {
      id: 'deep-work',
      title: 'Deep Work',
      author: 'Cal Newport',
      concepts: ['deep work', 'shallow work', 'attention residue', 'focus rituals'],
      quotes: [],
      applications: ['focus', 'productivity', 'creative work'],
    },
    {
      id: 'getting-things-done',
      title: 'Getting Things Done',
      author: 'David Allen',
      concepts: ['capture', 'next action', 'trusted system', 'weekly review'],
      quotes: [],
      applications: ['task management', 'overwhelm', 'execution'],
    },
    {
      id: 'atomic-habits',
      title: 'Atomic Habits',
      author: 'James Clear',
      concepts: ['identity-based habits', 'cue craving response reward', 'environment design', 'habit stacking'],
      quotes: [],
      applications: ['habits', 'behavior change', 'procrastination'],
    },
    {
      id: 'four-thousand-weeks',
      title: 'Four Thousand Weeks',
      author: 'Oliver Burkeman',
      concepts: ['finitude', 'strategic underachievement', 'settling', 'attention'],
      quotes: [],
      applications: ['time management', 'priorities', 'burnout'],
    },
    {
      id: 'crucial-conversations',
      title: 'Crucial Conversations',
      author: 'Kerry Patterson, Joseph Grenny, Ron McMillan, and Al Switzler',
      concepts: ['shared pool of meaning', 'safety', 'STATE', 'mutual purpose'],
      quotes: [],
      applications: ['conflict', 'feedback', 'difficult conversations'],
    },
    {
      id: 'never-split-the-difference',
      title: 'Never Split the Difference',
      author: 'Chris Voss with Tahl Raz',
      concepts: ['tactical empathy', 'mirroring', 'labeling', 'calibrated questions'],
      quotes: [],
      applications: ['negotiation', 'salary', 'sales'],
    },
    {
      id: 'the-effective-executive',
      title: 'The Effective Executive',
      author: 'Peter F. Drucker',
      concepts: ['time audit', 'contribution', 'strengths', 'effective decisions'],
      quotes: [],
      applications: ['management', 'leadership', 'executive work'],
    },
    {
      id: 'high-output-management',
      title: 'High Output Management',
      author: 'Andrew S. Grove',
      concepts: ['managerial leverage', 'task relevant maturity', 'one-on-ones', 'output'],
      quotes: [],
      applications: ['management', 'delegation', 'team operations'],
    },
    {
      id: 'the-checklist-manifesto',
      title: 'The Checklist Manifesto',
      author: 'Atul Gawande',
      concepts: ['checklists', 'complexity', 'discipline', 'pause points'],
      quotes: [],
      applications: ['operations', 'quality', 'reliability'],
    },
    {
      id: 'so-good-they-cant-ignore-you',
      title: "So Good They Can't Ignore You",
      author: 'Cal Newport',
      concepts: ['career capital', 'craftsman mindset', 'control', 'mission'],
      quotes: [],
      applications: ['career decisions', 'skill building', 'work'],
    },
    {
      id: 'designing-your-life',
      title: 'Designing Your Life',
      author: 'Bill Burnett and Dave Evans',
      concepts: ['life design', 'wayfinding', 'odyssey plans', 'prototyping'],
      quotes: [],
      applications: ['career change', 'life decisions', 'experiments'],
    },
  ];

  const bookKnowledge = loadBookKnowledge();
  const retrievalCorpus = loadRetrievalCorpus();

  for (const book of seedBooks) {
    const knowledge = bookKnowledge.get(book.id);
    books.set(book.id, {
      ...book,
      knowledge_text: knowledge?.full_text ?? '',
      knowledge_chunks: knowledge?.chunks ?? [],
      knowledge_sections: knowledge?.sections ?? [],
      knowledge_source_path: knowledge?.source_path ?? null,
      knowledge_visibility: knowledge?.visibility ?? 'backend_only',
      created_at: now(),
      updated_at: now(),
    });
  }

  for (const book of retrievalCorpus.books ?? []) {
    const existing = books.get(book.id);
    books.set(book.id, {
      ...existing,
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      one_liner: book.one_liner,
      read_if: book.read_if,
      concepts: existing?.concepts?.length ? existing.concepts : book.tags,
      quotes: existing?.quotes ?? [],
      applications: unique([...(existing?.applications ?? []), book.one_liner, book.read_if, ...(book.tags ?? [])].filter(Boolean)),
      url: book.url,
      retrieval_type: 'book',
      knowledge_text: [existing?.knowledge_text, book.semantic_text, book.text].filter(Boolean).join('\n\n'),
      knowledge_chunks: existing?.knowledge_chunks ?? [],
      knowledge_sections: existing?.knowledge_sections ?? [],
      knowledge_source_path: existing?.knowledge_source_path ?? '../web/src/content/books',
      knowledge_visibility: existing?.knowledge_visibility ?? 'backend_only',
      created_at: existing?.created_at ?? now(),
      updated_at: now(),
    });
  }

  for (const answer of retrievalCorpus.answers ?? []) {
    const answerBooks = answer.books
      .map((id) => books.get(id))
      .filter(Boolean)
      .map((book) => ({ id: book.id, title: book.title, author: book.author }));
    content.set(`answer:${answer.id}`, {
      id: `answer:${answer.id}`,
      type: 'answer',
      status: 'published',
      question: answer.question,
      title: answer.title,
      description: answer.description,
      body: answer.text,
      url: answer.url,
      books: answerBooks,
      concepts: answer.tags ?? [],
      source_ids: ['answers', 'books'],
      cache_key: answer.id,
      created_at: now(),
      updated_at: now(),
    });
  }

  return {
    now,
    books,
    questions,
    concerns,
    content,
    demandSignals,
    sources,
  };
}

function loadBookKnowledge() {
  const path = new URL('../research/book-corpus.json', import.meta.url).pathname;
  if (!existsSync(path)) return new Map();
  try {
    const corpus = JSON.parse(readFileSync(path, 'utf8'));
    return new Map((corpus.books ?? []).map((book) => [book.id, book]));
  } catch {
    return new Map();
  }
}

function loadRetrievalCorpus() {
  const path = new URL('../research/retrieval-corpus.json', import.meta.url).pathname;
  if (!existsSync(path)) return { books: [], answers: [] };
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { books: [], answers: [] };
  }
}

function unique(items) {
  return [...new Set(items)];
}

export function makeId(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

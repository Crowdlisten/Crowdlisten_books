export function createStore() {
  const now = () => new Date().toISOString();

  const books = new Map();
  const questions = new Map();
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
  ];

  for (const book of seedBooks) {
    books.set(book.id, { ...book, created_at: now(), updated_at: now() });
  }

  return {
    now,
    books,
    questions,
    content,
    demandSignals,
    sources,
  };
}

export function makeId(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const webRoot = resolve(repoRoot, '../web/src/content');
const outputPath = join(repoRoot, 'research', 'retrieval-corpus.json');

const books = readCollection('books').map((entry) => {
  const text = markdownToText(entry.body);
  return {
    id: entry.slug,
    type: 'book',
    title: entry.data.title,
    author: entry.data.author,
    year: entry.data.year ?? null,
    one_liner: entry.data.oneLiner ?? '',
    read_if: entry.data.readIf ?? '',
    tags: entry.data.tags ?? [],
    featured: Boolean(entry.data.featured),
    url: `/books/${entry.slug}/`,
    text,
    semantic_text: [
      entry.data.title,
      entry.data.author,
      entry.data.oneLiner,
      entry.data.readIf,
      ...(entry.data.tags ?? []),
      text,
    ].filter(Boolean).join('\n'),
  };
});

const answers = readCollection('answers').map((entry) => {
  const text = markdownToText(entry.body);
  return {
    id: entry.slug,
    type: 'answer',
    question: entry.data.question,
    title: entry.data.question,
    description: entry.data.description ?? '',
    books: entry.data.books ?? [],
    tags: entry.data.tags ?? [],
    featured: Boolean(entry.data.featured),
    url: `/answers/${entry.slug}/`,
    text,
    semantic_text: [
      entry.data.question,
      entry.data.description,
      ...(entry.data.books ?? []),
      ...(entry.data.tags ?? []),
      text,
    ].filter(Boolean).join('\n'),
  };
});

const corpus = {
  version: 1,
  generated_at: new Date().toISOString(),
  source: '../web/src/content',
  counts: {
    books: books.length,
    answers: answers.length,
  },
  books,
  answers,
};

writeFileSync(outputPath, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
console.log(`- ${books.length} books`);
console.log(`- ${answers.length} answers`);

function readCollection(name) {
  const dir = join(webRoot, name);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const slug = basename(file, '.md');
      const raw = readFileSync(join(dir, file), 'utf8');
      const { data, body } = parseMarkdown(raw);
      return { slug, data, body };
    });
}

function parseMarkdown(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };
  return {
    data: parseFrontmatter(match[1]),
    body: match[2].trim(),
  };
}

function parseFrontmatter(source) {
  const data = {};
  let currentKey = null;
  for (const line of source.split('\n')) {
    if (/^\s+-\s+/.test(line) && currentKey) {
      data[currentKey] ??= [];
      data[currentKey].push(cleanScalar(line.replace(/^\s+-\s+/, '')));
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    currentKey = key;
    data[key] = parseValue(rawValue);
  }
  return data;
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === '') return [];
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => cleanScalar(item))
      .filter(Boolean);
  }
  return cleanScalar(trimmed);
}

function cleanScalar(value) {
  return value.trim().replace(/^["']|["']$/g, '');
}

function markdownToText(markdown) {
  return String(markdown)
    .replace(/<figure\b[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/gi, '\n\n$1\n\n')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => ({
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    })[entity] ?? ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

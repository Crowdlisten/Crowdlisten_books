#!/usr/bin/env node

const inputDir =
  getArg('--input') ?? new URL('../../web/src/content/books/', import.meta.url).pathname;
const output =
  getArg('--output') ?? new URL('../research/book-corpus.json', import.meta.url).pathname;
const textOutputDir =
  getArg('--text-output') ?? new URL('../research/book-text/', import.meta.url).pathname;

const fs = await import('node:fs/promises');
const path = await import('node:path');

const files = (await fs.readdir(inputDir))
  .filter((file) => file.endsWith('.md'))
  .sort();

const books = [];

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.mkdir(textOutputDir, { recursive: true });

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const filePath = path.join(inputDir, file);
  const raw = await fs.readFile(filePath, 'utf8');
  const { frontmatter, body } = parseMarkdown(raw);
  const plainText = markdownToText(body);
  const sections = splitSections(body);
  const chunks = chunkText(plainText);

  const record = {
    id: slug,
    title: frontmatter.title ?? titleize(slug),
    author: frontmatter.author ?? '',
    year: Number(frontmatter.year ?? 0) || null,
    tags: parseArray(frontmatter.tags),
    one_liner: frontmatter.oneLiner ?? '',
    read_if: frontmatter.readIf ?? '',
    source_path: relativeFromRepo(filePath),
    visibility: 'backend_only',
    text_file: `research/book-text/${slug}.txt`,
    sections,
    chunks,
    full_text: [
      frontmatter.oneLiner,
      frontmatter.readIf,
      plainText,
    ].filter(Boolean).join('\n\n'),
  };

  books.push(record);
  await fs.writeFile(
    path.join(textOutputDir, `${slug}.txt`),
    `${record.title}\n${record.author}${record.year ? `, ${record.year}` : ''}\n\n${record.full_text}\n`,
    'utf8'
  );
}

const corpus = {
  generated_at: new Date().toISOString(),
  source: relativeFromRepo(inputDir),
  visibility: 'backend_only',
  note:
    'Generated from public book Markdown for backend retrieval and matching. This corpus is not rendered directly in the UI.',
  books,
};

await fs.writeFile(output, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
console.log(`wrote ${relativeFromRepo(output)} (${books.length} books)`);
console.log(`wrote ${relativeFromRepo(textOutputDir)} (${books.length} txt files)`);

function parseMarkdown(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  return { frontmatter: parseFrontmatter(match[1]), body: match[2] };
}

function parseFrontmatter(value) {
  const data = {};
  for (const line of value.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    data[key] = parseScalar(rawValue.trim());
  }
  return data;
}

function parseScalar(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const match = value.match(/^\[(.*)\]$/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function splitSections(markdown) {
  const sections = [];
  const parts = markdown.split(/\n(?=##\s+)/);
  for (const part of parts) {
    const heading = part.match(/^##\s+(.+)$/m)?.[1]?.trim() ?? 'Overview';
    const text = markdownToText(part);
    if (text) sections.push({ heading, text });
  }
  return sections;
}

function markdownToText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/>\s?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text, maxLength = 1200) {
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    if (`${current}\n\n${paragraph}`.length <= maxLength) {
      current = `${current}\n\n${paragraph}`;
    } else {
      chunks.push(current);
      current = paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.map((text, index) => ({ id: `chunk_${index + 1}`, text }));
}

function titleize(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function relativeFromRepo(value) {
  const normalized = value.replaceAll('\\', '/');
  const marker = '/answerwithbooks/';
  const index = normalized.indexOf(marker);
  return index === -1 ? normalized : normalized.slice(index + marker.length);
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

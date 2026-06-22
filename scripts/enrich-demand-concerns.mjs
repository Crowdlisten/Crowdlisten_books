#!/usr/bin/env node

const input =
  getArg('--input') ?? new URL('../research/reddit-question-discovery.json', import.meta.url).pathname;
const concernsOutput =
  getArg('--concerns-output') ?? new URL('../research/concern-seeds.json', import.meta.url).pathname;
const briefsOutput =
  getArg('--briefs-output') ?? new URL('../research/answer-briefs.json', import.meta.url).pathname;

const discovery = await readJson(input);
const generatedAt = new Date().toISOString();

const concerns = discovery.clusters.map((cluster) => buildConcern(cluster, discovery));
const briefs = concerns.map(buildBrief);

await writeJson(concernsOutput, {
  generated_at: generatedAt,
  source: input,
  method:
    'CrowdListen-style enrichment: cluster social evidence into a user concern, infer pain/audience, attach book lenses, and score whether the concern is ready for a book-grounded guide.',
  concerns,
});

await writeJson(briefsOutput, {
  generated_at: generatedAt,
  source: concernsOutput,
  briefs,
});

console.log(`wrote ${concernsOutput}`);
console.log(`wrote ${briefsOutput}`);
for (const concern of concerns) {
  console.log(
    `- ${concern.id}: ${concern.publish_recommendation.status} (${concern.publish_recommendation.score}) ${concern.title}`
  );
}

function buildConcern(cluster, discovery) {
  const evidence = cluster.evidence ?? [];
  const evidenceText = evidence.map((item) => `${item.title} ${item.body_excerpt ?? ''}`).join('\n');
  const platforms = [...new Set(evidence.map((item) => `reddit:r/${item.subreddit}`))].sort();
  const totalComments = evidence.reduce((sum, item) => sum + Number(item.num_comments ?? 0), 0);
  const totalScore = evidence.reduce((sum, item) => sum + Number(item.score ?? 0), 0);
  const pain = inferPain(evidenceText);
  const audience = inferAudience(evidenceText, cluster.working_title);
  const questionVariants = evidence
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 6);
  const sourceFit = sourceFitFor(cluster.books);
  const score = readinessScore({ evidence, pain, sourceFit });

  return {
    id: cluster.id,
    title: cluster.working_title,
    concern: concernStatement(cluster.working_title, pain),
    audience,
    platforms,
    books: cluster.books,
    pain_points: pain,
    question_variants: questionVariants,
    evidence_summary: {
      evidence_count: evidence.length,
      total_comments: totalComments,
      total_score: totalScore,
      generated_from: discovery.method?.source ?? 'unknown',
      generated_after: discovery.method?.after ?? null,
    },
    evidence: evidence.map((item) => ({
      title: item.title,
      platform: 'reddit',
      subreddit: item.subreddit,
      url: item.url,
      published_at: item.published_at,
      score: item.score,
      comments: item.num_comments,
      excerpt: item.body_excerpt,
      discovered_by: item.discovered_by,
    })),
    source_fit: sourceFit,
    publish_recommendation: {
      status: score >= 0.7 ? 'ready_for_draft' : score >= 0.5 ? 'needs_source_review' : 'hold',
      score,
      reason:
        score >= 0.7
          ? 'Repeated high-intent social question with clear fit to existing book notes.'
          : 'Needs stronger evidence or source review before publishing.',
    },
  };
}

function buildBrief(concern) {
  return {
    id: concern.id,
    title: concern.title,
    format: 'how_to_guide',
    audience: concern.audience,
    user_problem: concern.concern,
    social_evidence: concern.evidence.slice(0, 4).map((item) => ({
      title: item.title,
      url: item.url,
      subreddit: item.subreddit,
      comments: item.comments,
    })),
    book_lenses: concern.books.map((book) => ({
      book_id: book,
      use_for: lensFor(book),
    })),
    answer_shape: [
      'Start with the user confusion in plain language.',
      'Name the mechanism the books reveal.',
      'Use one book as the primary lens and one book as the correction or operating constraint.',
      'End with a checklist or decision rule the reader can use immediately.',
    ],
    quality_bar: [
      'Do not publish if the answer can be written from generic advice alone.',
      'Use exact quotes only from verified notes, PDFs, or a quote ledger.',
      'Preserve the social evidence trail in research files even when the public page stays clean.',
      'Keep the public title as a how-to guide, not a book-title reference.',
    ],
  };
}

function inferPain(text) {
  const rules = [
    ['uncertainty', /\bnot sure|uncertain|confus(?:ed|ing)|how do i|how should/i],
    ['wasted_building', /\bbuild|mvp|feature|ship|launched|coding/i],
    ['bad_evidence', /\binterview|feedback|data|metric|analytics|validate|research/i],
    ['stakeholder_pressure', /\bstakeholder|manager|leadership|cofounder|team|alignment/i],
    ['planning_breakdown', /\bplan|roadmap|strategy|priority|estimate|deadline|timeline/i],
    ['communication_gap', /\bexplain|positioning|message|copy|pitch|video/i],
    ['decision_fatigue', /\bdecision|choice|prioriti|consensus|pivot|gut/i],
  ];
  const matches = rules.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
  return matches.length ? matches : ['practical_confusion'];
}

function inferAudience(text, title) {
  const combined = `${title} ${text}`;
  if (/\bPM|ProductManagement|roadmap|feature|stakeholder/i.test(combined)) return 'product leader';
  if (/\bfounder|startup|SaaS|MVP|validate/i.test(combined)) return 'early-stage founder';
  if (/\bmanager|leadership|team|cofounder/i.test(combined)) return 'team leader';
  if (/\bUX|homepage|landing page|usability|design/i.test(combined)) return 'product designer';
  if (/\bmarketing|positioning|copy|pitch/i.test(combined)) return 'operator explaining a product';
  return 'busy operator';
}

function sourceFitFor(books) {
  return {
    corpus: 'curated_book_notes',
    status: 'usable_for_draft',
    limitations: [
      'Full PDF chunks are not connected yet.',
      'Exact quotes require a verified quote ledger before publication.',
    ],
    matched_books: books,
  };
}

function readinessScore({ evidence, pain, sourceFit }) {
  const evidenceScore = Math.min(0.45, evidence.length * 0.055);
  const engagement = evidence.reduce((sum, item) => sum + Math.log1p(Number(item.num_comments ?? 0)), 0);
  const engagementScore = Math.min(0.25, engagement / 45);
  const painScore = Math.min(0.15, pain.length * 0.04);
  const sourceScore = sourceFit.matched_books.length ? 0.15 : 0;
  return Number((evidenceScore + engagementScore + painScore + sourceScore).toFixed(2));
}

function concernStatement(title, pain) {
  const cleanTitle = title.replace(/^How to\s+/i, '').replace(/\?$/, '');
  return `People are trying to ${cleanTitle}, but the social evidence suggests ${humanList(pain)} are getting in the way.`;
}

function humanList(items) {
  return items.map((item) => item.replaceAll('_', ' ')).join(', ');
}

function lensFor(book) {
  const lenses = {
    'the-mom-test': 'separate polite encouragement from evidence of real behavior and commitment',
    'thinking-fast-and-slow': 'detect overconfidence, substitution, inside-view planning, and misleading intuition',
    'seeing-like-a-state': 'notice what plans and dashboards delete from messy local reality',
    'the-wisdom-of-crowds': 'protect independent judgment and aggregate diverse evidence instead of loud opinions',
    'the-structure-of-scientific-revolutions': 'tell normal friction from a framework-level crisis',
    'good-strategy-bad-strategy': 'turn vague goals into diagnosis, guiding policy, and coherent action',
    'the-lean-startup': 'test the riskiest assumption with the smallest useful experiment',
    'dont-make-me-think': 'remove decoding work so users can understand and act quickly',
    'made-to-stick': 'make the core idea concrete, memorable, and easy to retell',
    'deep-work': 'protect long stretches of attention from shallow-work fragmentation',
    'getting-things-done': 'turn open loops into captured next actions inside a trusted system',
    'atomic-habits': 'make behavior change depend on identity, environment, and small repeatable cues',
    'four-thousand-weeks': 'choose what deserves finite attention instead of optimizing every obligation',
    'crucial-conversations': 'restore safety and mutual purpose before trying to solve the disagreement',
    'never-split-the-difference': 'use tactical empathy, labels, and calibrated questions before bargaining',
    'the-effective-executive': 'audit time and contribution before adding more managerial activity',
    'high-output-management': 'increase managerial leverage through clear outputs, delegation, and one-on-ones',
    'the-checklist-manifesto': 'use simple pause-point checklists to prevent avoidable failures in complex work',
    'so-good-they-cant-ignore-you': 'build career capital before expecting autonomy, mission, or rare opportunities',
    'designing-your-life': 'prototype multiple possible paths before treating a career choice as a single leap',
  };
  return lenses[book] ?? 'supply the book-specific lens for the answer';
}

async function readJson(path) {
  const fs = await import('node:fs/promises');
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  const fs = await import('node:fs/promises');
  await fs.writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

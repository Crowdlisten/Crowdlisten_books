#!/usr/bin/env node

const API_BASE = 'https://arctic-shift.photon-reddit.com/api/posts/search';
const USER_AGENT = 'AnswerWithBooks question discovery/0.1';

const clusters = [
  {
    id: 'validate-without-fooling-yourself',
    workingTitle: 'How to validate an idea without fooling yourself',
    books: ['the-mom-test', 'thinking-fast-and-slow'],
    queries: [
      ['startups', 'customer discovery'],
      ['startups', 'validate idea'],
      ['startups', 'talk to users'],
      ['ProductManagement', 'user interviews'],
      ['Entrepreneur', 'validate idea'],
    ],
  },
  {
    id: 'repair-user-interviews',
    workingTitle: 'How to fix user interviews that are not teaching you anything',
    books: ['the-mom-test'],
    queries: [
      ['ProductManagement', 'user interviews'],
      ['startups', 'customer interviews'],
      ['UXResearch', 'user interviews'],
      ['UXResearch', 'research participants'],
      ['SaaS', 'customer interviews'],
    ],
  },
  {
    id: 'trust-gut-or-check-it',
    workingTitle: 'How to know when to trust your gut',
    books: ['thinking-fast-and-slow'],
    queries: [
      ['careerguidance', 'trust my gut'],
      ['jobs', 'trust my gut'],
      ['cscareerquestions', 'gut feeling'],
      ['Entrepreneur', 'gut feeling'],
      ['ProductManagement', 'intuition'],
    ],
  },
  {
    id: 'prevent-smart-team-bad-decision',
    workingTitle: 'How to keep a smart team from making a dumb decision',
    books: ['the-wisdom-of-crowds', 'thinking-fast-and-slow'],
    queries: [
      ['managers', 'team decision'],
      ['ExperiencedDevs', 'team decision'],
      ['ProductManagement', 'stakeholder alignment'],
      ['startups', 'consensus'],
      ['Leadership', 'decision making'],
    ],
  },
  {
    id: 'pivot-without-panicking',
    workingTitle: 'How to tell whether to pivot or keep going',
    books: ['the-structure-of-scientific-revolutions', 'thinking-fast-and-slow'],
    queries: [
      ['startups', 'pivot'],
      ['Entrepreneur', 'pivot'],
      ['SaaS', 'pivot'],
      ['ProductManagement', 'change strategy'],
      ['indiehackers', 'pivot'],
    ],
  },
  {
    id: 'plan-that-survives-reality',
    workingTitle: 'How to make a plan that survives contact with reality',
    books: ['seeing-like-a-state', 'the-wisdom-of-crowds'],
    queries: [
      ['managers', 'process change'],
      ['ExperiencedDevs', 'reorg'],
      ['sysadmin', 'migration plan'],
      ['devops', 'planning'],
      ['ProductManagement', 'roadmap failed'],
    ],
  },
  {
    id: 'strategy-without-slogans',
    workingTitle: 'How to turn a vague goal into an actual strategy',
    books: ['good-strategy-bad-strategy', 'seeing-like-a-state'],
    queries: [
      ['startups', 'strategy'],
      ['Entrepreneur', 'business strategy'],
      ['ProductManagement', 'strategy'],
      ['managers', 'strategic plan'],
      ['SaaS', 'go to market strategy'],
    ],
  },
  {
    id: 'test-risk-before-building',
    workingTitle: 'How to test a risky idea before you build too much',
    books: ['the-lean-startup', 'the-mom-test'],
    queries: [
      ['startups', 'MVP'],
      ['Entrepreneur', 'minimum viable product'],
      ['SaaS', 'validate MVP'],
      ['ProductManagement', 'experiment'],
      ['indiehackers', 'MVP'],
    ],
  },
  {
    id: 'make-confusing-page-clear',
    workingTitle: 'How to make a confusing page easier to use',
    books: ['dont-make-me-think', 'thinking-fast-and-slow'],
    queries: [
      ['web_design', 'confusing website'],
      ['UXDesign', 'user confused'],
      ['UXDesign', 'homepage'],
      ['ProductManagement', 'onboarding confused'],
      ['SaaS', 'landing page conversion'],
    ],
  },
  {
    id: 'make-idea-stick',
    workingTitle: 'How to explain an idea so people remember it',
    books: ['made-to-stick', 'the-wisdom-of-crowds'],
    queries: [
      ['marketing', 'explain product'],
      ['copywriting', 'message not clear'],
      ['startups', 'explain startup'],
      ['Entrepreneur', 'elevator pitch'],
      ['ProductMarketing', 'positioning'],
    ],
  },
  {
    id: 'prioritize-without-loudest-voice',
    workingTitle: 'How to prioritize when every request sounds urgent',
    books: ['good-strategy-bad-strategy', 'the-wisdom-of-crowds'],
    queries: [
      ['ProductManagement', 'prioritize roadmap'],
      ['ProductManagement', 'feature requests'],
      ['SaaS', 'feature requests'],
      ['startups', 'prioritize features'],
      ['ExperiencedDevs', 'stakeholder priorities'],
    ],
  },
  {
    id: 'make-estimates-less-fictional',
    workingTitle: 'How to make project estimates less fictional',
    books: ['thinking-fast-and-slow', 'seeing-like-a-state'],
    queries: [
      ['ExperiencedDevs', 'estimate project'],
      ['ProductManagement', 'timeline estimates'],
      ['devops', 'estimation'],
      ['projectmanagement', 'estimates'],
      ['softwaredevelopment', 'deadline estimates'],
    ],
  },
  {
    id: 'turn-feedback-into-signal',
    workingTitle: 'How to turn messy feedback into a real signal',
    books: ['the-mom-test', 'the-wisdom-of-crowds'],
    queries: [
      ['ProductManagement', 'user feedback'],
      ['SaaS', 'customer feedback'],
      ['startups', 'feature requests'],
      ['UXResearch', 'conflicting feedback'],
      ['Entrepreneur', 'customer feedback'],
    ],
  },
  {
    id: 'avoid-vanity-metric-trap',
    workingTitle: 'How to know whether your metrics are lying to you',
    books: ['the-lean-startup', 'thinking-fast-and-slow'],
    queries: [
      ['startups', 'vanity metrics'],
      ['SaaS', 'conversion metrics'],
      ['ProductManagement', 'north star metric'],
      ['analytics', 'misleading metrics'],
      ['Entrepreneur', 'traction metrics'],
    ],
  },
  {
    id: 'align-stakeholders-without-consensus-theater',
    workingTitle: 'How to align stakeholders without consensus theater',
    books: ['the-wisdom-of-crowds', 'good-strategy-bad-strategy'],
    queries: [
      ['ProductManagement', 'conflicting priorities'],
      ['ProductManagement', 'stakeholder management'],
      ['managers', 'conflicting priorities'],
      ['ExperiencedDevs', 'product manager disagreement'],
      ['projectmanagement', 'conflicting priorities'],
    ],
  },
  {
    id: 'work-deeply-without-constant-interruptions',
    workingTitle: 'How to work deeply when everything keeps interrupting you',
    books: ['deep-work', 'getting-things-done'],
    queries: [
      ['productivity', 'constant interruptions'],
      ['productivity', 'deep work'],
      ['ADHD_Programmers', 'focus at work'],
      ['ExperiencedDevs', 'interruptions'],
      ['getdisciplined', 'focus'],
    ],
  },
  {
    id: 'stop-procrastinating-important-work',
    workingTitle: 'How to stop procrastinating when the task actually matters',
    books: ['atomic-habits', 'four-thousand-weeks'],
    queries: [
      ['getdisciplined', 'procrastination'],
      ['productivity', 'procrastinating'],
      ['ADHD', 'procrastination'],
      ['DecidingToBeBetter', 'procrastination'],
      ['Entrepreneur', 'procrastination'],
    ],
  },
  {
    id: 'escape-task-overwhelm',
    workingTitle: 'How to get out of task overwhelm without reorganizing your whole life',
    books: ['getting-things-done', 'four-thousand-weeks'],
    queries: [
      ['productivity', 'overwhelmed tasks'],
      ['getdisciplined', 'too many tasks'],
      ['ADHD', 'overwhelmed tasks'],
      ['projectmanagement', 'task overload'],
      ['managers', 'too much work'],
    ],
  },
  {
    id: 'hard-conversation-without-making-it-worse',
    workingTitle: 'How to have a hard conversation without making it worse',
    books: ['crucial-conversations', 'thinking-fast-and-slow'],
    queries: [
      ['managers', 'difficult conversation'],
      ['work', 'difficult conversation'],
      ['careerguidance', 'difficult conversation'],
      ['ExperiencedDevs', 'feedback conversation'],
      ['Leadership', 'conflict conversation'],
    ],
  },
  {
    id: 'negotiate-salary-without-guessing',
    workingTitle: 'How to negotiate salary without guessing your worth',
    books: ['never-split-the-difference', 'thinking-fast-and-slow'],
    queries: [
      ['careerguidance', 'salary negotiation'],
      ['jobs', 'negotiate salary'],
      ['cscareerquestions', 'salary negotiation'],
      ['ExperiencedDevs', 'compensation negotiation'],
      ['AskEngineers', 'salary negotiation'],
    ],
  },
  {
    id: 'delegate-without-losing-control',
    workingTitle: 'How to delegate without losing control',
    books: ['high-output-management', 'the-effective-executive'],
    queries: [
      ['managers', 'delegate'],
      ['Leadership', 'delegation'],
      ['ExperiencedDevs', 'delegating'],
      ['projectmanagement', 'delegate'],
      ['Entrepreneur', 'delegating'],
    ],
  },
  {
    id: 'prevent-obvious-mistakes',
    workingTitle: 'How to prevent obvious mistakes without adding bureaucracy',
    books: ['the-checklist-manifesto', 'thinking-fast-and-slow'],
    queries: [
      ['projectmanagement', 'avoid mistakes'],
      ['ExperiencedDevs', 'prevent mistakes'],
      ['sysadmin', 'checklist'],
      ['devops', 'postmortem mistakes'],
      ['managers', 'process mistakes'],
    ],
  },
  {
    id: 'decide-career-next-step',
    workingTitle: 'How to decide what to do with your career next',
    books: ['designing-your-life', 'so-good-they-cant-ignore-you'],
    queries: [
      ['careerguidance', 'what should I do with my career'],
      ['careerguidance', 'career change'],
      ['jobs', 'career change'],
      ['cscareerquestions', 'career switch'],
      ['findapath', 'career'],
    ],
  },
];

const confusionPatterns = [
  /\bhow (?:do|can|should)\b/i,
  /\bwhat (?:do|should|would)\b/i,
  /\bwhen (?:do|should|can)\b/i,
  /\bhas anyone\b/i,
  /\bany advice\b/i,
  /\bstruggl(?:e|ing)\b/i,
  /\bconfus(?:ed|ing|ion)\b/i,
  /\bnot (?:sure|working|going well)\b/i,
  /\boverwhelm(?:ed|ing)?\b/i,
  /\bfrustrat(?:ed|ing)?\b/i,
  /\bstuck\b/i,
  /\bkeep making\b/i,
];

const demandPatterns = [
  /\binterview(?:s|ing)?\b/i,
  /\bvalidate|validation\b/i,
  /\bcustomer discovery\b/i,
  /\bfeedback|feature request(?:s)?\b/i,
  /\bdecision(?:s|-making| making)?\b/i,
  /\btrust my gut|gut feeling|intuition\b/i,
  /\bpivot\b/i,
  /\bplan|planning|roadmap|strategy|priorit(?:y|ize|ization)\b/i,
  /\bteam|meeting|consensus|alignment|stakeholder(?:s)?\b/i,
  /\bestimat(?:e|es|ion)|deadline|timeline\b/i,
  /\bmetric(?:s)?|analytics|conversion|traction\b/i,
  /\bfocus|interrupt(?:ed|ions)|deep work|procrastinat(?:e|ing|ion)\b/i,
  /\boverwhelm(?:ed|ing)?|too many tasks|burn(?:ed)? out|burnout\b/i,
  /\bdifficult conversation|conflict|feedback|salary|negotiat(?:e|ion)\b/i,
  /\bdelegat(?:e|ing|ion)|checklist|mistake(?:s)?|career change|career switch\b/i,
];

const promotionalPatterns = [
  /\b(?:i|we) (?:built|launched|made|created)\b/i,
  /\bcheck out\b/i,
  /\bsurvey\b/i,
  /\bmaster thesis\b/i,
  /\bfree trial\b/i,
];

const after = getArg('--after') ?? '2024-01-01';
const perQueryLimit = Number(getArg('--limit') ?? 20);
const output = getArg('--output') ?? new URL('../research/reddit-question-discovery.json', import.meta.url).pathname;
const clusterFilter = new Set(getAllArgs('--cluster'));
const delayMs = Number(getArg('--delay-ms') ?? 0);
const maxRetries = Number(getArg('--retries') ?? 2);

const result = {
  generated_at: new Date().toISOString(),
  method: {
    source: 'Arctic Shift Reddit archive',
    note: 'Focused CrowdListen-style question discovery for Answer with Books. Scores favor explicit user questions, confusion, frustration, and engagement; final content still requires editorial review against books.',
    after,
    per_query_limit: perQueryLimit,
  },
  clusters: [],
};

for (const cluster of clusters.filter((item) => !clusterFilter.size || clusterFilter.has(item.id))) {
  const seen = new Map();
  for (const [subreddit, term] of cluster.queries) {
    const posts = await searchPosts({ subreddit, term, after, limit: perQueryLimit });
    for (const post of posts) {
      const id = String(post.id ?? `${subreddit}:${post.title}`);
      const normalized = normalizePost(post, { subreddit, term });
      const existing = seen.get(id);
      if (!existing || normalized.discovery_score > existing.discovery_score) {
        seen.set(id, normalized);
      }
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  const evidence = [...seen.values()]
    .map((post) => ({
      ...post,
      discovery_score: scorePost(post, cluster),
    }))
    .filter((post) => post.discovery_score >= 2.2)
    .sort((a, b) => b.discovery_score - a.discovery_score || b.num_comments - a.num_comments)
    .slice(0, 8);

  result.clusters.push({
    id: cluster.id,
    working_title: cluster.workingTitle,
    books: cluster.books,
    evidence,
  });
}

await writeJson(output, result);
console.log(`wrote ${output}`);
for (const cluster of result.clusters) {
  console.log(`- ${cluster.id}: ${cluster.evidence.length} evidence items`);
}

async function searchPosts({ subreddit, term, after, limit }) {
  const params = new URLSearchParams({
    subreddit,
    title: term,
    after,
    limit: String(limit),
    sort: 'desc',
    fields: 'id,title,selftext,url,author,score,num_comments,created_utc,subreddit',
  });
  const url = `${API_BASE}?${params.toString()}`;
  let response;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT },
    });
    if (response.status !== 429 || attempt === maxRetries) break;
    const wait = Math.max(1000, delayMs) * (attempt + 1);
    console.warn(`retry r/${subreddit} "${term}" after HTTP 429 in ${wait}ms`);
    await sleep(wait);
  }
  if (!response.ok) {
    console.warn(`skip r/${subreddit} "${term}": HTTP ${response.status}`);
    return [];
  }
  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

function normalizePost(post, query) {
  const title = clean(post.title);
  const body = clean(post.selftext);
  const created = Number(post.created_utc);
  return {
    reddit_id: String(post.id ?? ''),
    title,
    body_excerpt: excerpt(body || title, 900),
    url: post.url || (post.id ? `https://www.reddit.com/comments/${post.id}` : ''),
    subreddit: post.subreddit || query.subreddit,
    author: post.author || '',
    published_at: Number.isFinite(created) && created > 0 ? new Date(created * 1000).toISOString() : null,
    score: Number(post.score ?? 0),
    num_comments: Number(post.num_comments ?? 0),
    discovered_by: query,
  };
}

function scorePost(post, cluster) {
  const text = `${post.title}\n${post.body_excerpt}`;
  let score = 0;
  score += matchCount(text, confusionPatterns) * 0.75;
  score += matchCount(text, demandPatterns) * 0.45;
  score += cluster.workingTitle
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 3 && text.toLowerCase().includes(token)).length * 0.2;
  score += Math.min(1.4, Math.log1p(Math.max(0, post.num_comments)) / 2);
  score += Math.min(0.7, Math.log1p(Math.max(0, post.score)) / 5);
  score += post.title.includes('?') ? 0.8 : 0;
  score -= matchCount(text, promotionalPatterns) * 0.9;
  return Number(score.toFixed(2));
}

function matchCount(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function excerpt(value, maxLength) {
  const text = clean(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
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

function getAllArgs(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

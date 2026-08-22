import { strict as assert } from 'assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { marked } from 'marked';
import { createRenderer, computeRelatedPosts, shouldPruneDir } from './lib/posts.mjs';
import { escapeXml, toRfc822 } from './lib/xml.mjs';
import { deriveOssStats } from './lib/oss-stats.mjs';

// ── Tests ──

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

console.log('shouldPruneDir');
const TMP = mkdtempSync(join(tmpdir(), 'pipeline-test-'));
test('deletes a dir carrying the generator fingerprint', () => {
  const dir = join(TMP, 'old-post');
  mkdirSync(dir);
  writeFileSync(join(dir, 'index.html'),
    '<html><head><link rel="canonical" href="https://jcosta.tech/writing/old-post/"></head></html>');
  assert.equal(shouldPruneDir(dir, 'old-post', new Set()), 'delete');
});
test('keep-warns when index.html is missing', () => {
  const dir = join(TMP, 'no-index');
  mkdirSync(dir);
  assert.equal(shouldPruneDir(dir, 'no-index', new Set()), 'keep-warn');
});
test('keep-warns when the fingerprint is missing', () => {
  const dir = join(TMP, 'hand-made');
  mkdirSync(dir);
  writeFileSync(join(dir, 'index.html'), '<html><body>hand-authored page</body></html>');
  assert.equal(shouldPruneDir(dir, 'hand-made', new Set()), 'keep-warn');
});
test('skips names in validSlugs', () => {
  assert.equal(shouldPruneDir(join(TMP, 'live-post'), 'live-post', new Set(['live-post'])), 'skip');
});
test('skips the tags dir', () => {
  assert.equal(shouldPruneDir(join(TMP, 'tags'), 'tags', new Set()), 'skip');
});
rmSync(TMP, { recursive: true, force: true });

console.log('\nmarkdown renderer');
marked.setOptions({ renderer: createRenderer(), gfm: true, breaks: false });
test('escapes HTML inside code blocks', () => {
  const html = marked('```js\n<script>alert(1)</script>\n```');
  assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert(!html.includes('<script>'));
  assert(html.includes('data-lang="js"'));
});
test('code blocks without a language get no data-lang attribute', () => {
  const html = marked('```\nplain\n```');
  assert(html.includes('<pre><code>plain'));
});
test('images render lazy-loading with escaped attributes', () => {
  const html = marked('![alt "quoted"](/img/x.png "the title")');
  assert(html.includes('src="/img/x.png"'));
  assert(html.includes('alt="alt &quot;quoted&quot;"'));
  assert(html.includes('title="the title"'));
  assert(html.includes('loading="lazy"'));
});

console.log('\ncomputeRelatedPosts');
const POSTS = [
  { slug: 'a', date: '2026-01-05', tags: ['x', 'y'] },
  { slug: 'b', date: '2026-01-04', tags: ['x', 'y'] },
  { slug: 'c', date: '2026-01-03', tags: ['x'] },
  { slug: 'd', date: '2026-01-02', tags: ['y'] },
  { slug: 'e', date: '2026-01-06', tags: ['x', 'y'], archived: true },
  { slug: 'f', date: '2026-01-07', tags: ['z'] },
  { slug: 'g', date: '2025-12-30', tags: ['x'] },
];
test('ranks by tag overlap then recency, excludes self, caps at 3', () => {
  const related = computeRelatedPosts(POSTS, 'a');
  assert.deepEqual(related.map(p => p.slug), ['b', 'c', 'd']);
});
test('excludes archived posts and posts with no overlap', () => {
  const slugs = computeRelatedPosts(POSTS, 'a', 10).map(p => p.slug);
  assert(!slugs.includes('e'), 'archived post included');
  assert(!slugs.includes('f'), 'zero-overlap post included');
});
test('respects a custom limit', () => {
  assert.equal(computeRelatedPosts(POSTS, 'a', 1).length, 1);
});
test('returns [] for a post with no tags', () => {
  assert.deepEqual(computeRelatedPosts([{ slug: 'solo', date: '2026-01-01', tags: [] }], 'solo'), []);
});

console.log('\nescapeXml');
test('escapes all five special characters', () => {
  assert.equal(escapeXml(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
});
test('passes clean strings through', () => {
  assert.equal(escapeXml('hello world'), 'hello world');
});

console.log('\ntoRfc822');
test('formats a plain date as RFC-822 midnight UTC', () => {
  assert.equal(toRfc822('2026-06-08'), 'Mon, 08 Jun 2026 00:00:00 GMT');
});
test('timestamped dates produce Invalid Date (documents current behavior)', () => {
  // Appending T00:00:00Z to a string that already has a time component makes
  // an unparseable date. No post frontmatter uses timestamped dates today;
  // fixing this is deliberately out of scope for the extraction PR.
  assert.equal(toRfc822('2026-06-08T10:00:00Z'), 'Invalid Date');
});

console.log('\nderiveOssStats');
const PRS = [
  { repo: 'big/repo', stars: 6000, language: 'Go' },
  { repo: 'many/prs', stars: 300, language: 'TypeScript' },
  { repo: 'many/prs', stars: 300, language: 'TypeScript' },
  { repo: 'many/prs', stars: 300, language: 'TypeScript' },
  { repo: 'many/prs', stars: 300, language: 'TypeScript' },
  { repo: 'mid/one', stars: 500, language: 'Rust' },
  { repo: 'small/lib', stars: 100, language: 'JavaScript' },
  { repo: 'small/lib', stars: 120, language: 'JavaScript' },
];
test('counts PRs, repos, and languages', () => {
  const { stats } = deriveOssStats(PRS);
  assert.equal(stats.prsMerged, 8);
  assert.equal(stats.repos, '4+');
  assert.equal(stats.languages, 4);
});
test('ranks by stars * sqrt(prCount), so PR volume can outrank raw stars', () => {
  const { contributions } = deriveOssStats(PRS);
  // Scores: big/repo 6000, many/prs 300*sqrt(4)=600, mid/one 500, small/lib 120*sqrt(2)≈170
  assert.deepEqual(contributions.map(c => c.repo), ['big/repo', 'prs', 'one', 'lib']);
});
test('repos with >= 5000 stars keep their full name, others just the short name', () => {
  const { contributions } = deriveOssStats(PRS);
  assert.equal(contributions[0].repo, 'big/repo');
  assert.equal(contributions[1].repo, 'prs');
});
test('uses the latest star count and formats stars', () => {
  const { contributions } = deriveOssStats(PRS);
  const lib = contributions.find(c => c.repo === 'lib');
  assert.equal(lib.stars, '120');
  assert.equal(contributions[0].stars, '6k');
});
test('includes the prs count only for repos with >= 2 PRs', () => {
  const { contributions } = deriveOssStats(PRS);
  assert.equal(contributions.find(c => c.repo === 'prs').prs, 4);
  assert(!('prs' in contributions.find(c => c.repo === 'one')));
});
test('caps contributions at 8 but keeps allContributions complete', () => {
  const prs = Array.from({ length: 10 }, (_, i) => ({ repo: `owner/repo${i}`, stars: 100 + i, language: 'Go' }));
  const { contributions, allContributions } = deriveOssStats(prs);
  assert.equal(contributions.length, 8);
  assert.equal(allContributions.length, 10);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

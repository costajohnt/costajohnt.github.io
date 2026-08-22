import { strict as assert } from 'assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { createRenderer, computeRelatedPosts, shouldPruneDir } from './lib/posts.mjs';
import { escapeXml, toRfc822 } from './lib/xml.mjs';
import { deriveOssStats } from './lib/oss-stats.mjs';
import { renderWritingListHTML } from './lib/post-list.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
  { slug: 'h', date: '2026-01-08', tags: ['x', 'y'], draft: true },
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
test('excludes draft posts', () => {
  // 'h' has the highest overlap and the newest date: it would rank first
  // if the draft filter were broken.
  const slugs = computeRelatedPosts(POSTS, 'a', 10).map(p => p.slug);
  assert(!slugs.includes('h'), 'draft post included');
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
test('tolerates a time component (strips it, formats midnight UTC)', () => {
  assert.equal(toRfc822('2026-06-08T10:00:00Z'), 'Mon, 08 Jun 2026 00:00:00 GMT');
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

console.log('\nrenderWritingListHTML');
test('renders a writing-item per post, escaped, with empty-thumb fallback', () => {
  const html = renderWritingListHTML([
    { url: '/writing/x/', title: 'A & B', subtitle: 'sub', date: '2026-03-14', readTime: '5 min', coverImage: '' },
  ], {});
  assert(html.includes('class="writing-item"'));
  assert(html.includes('A &amp; B'));
  assert(html.includes('Mar 14, 2026'));
  assert(html.includes('writing-thumb-empty'));
});
test('uses the webp thumb variant when cover meta has one', () => {
  const html = renderWritingListHTML([
    { url: '/writing/x/', title: 't', subtitle: 's', date: '2026-03-14', readTime: '5 min', coverImage: '/assets/covers/x.png' },
  ], { x: { thumbWidth: 300, thumbHeight: 150 } });
  assert(html.includes('src="/assets/covers/webp/x-thumb.webp"'));
  assert(html.includes('width="300" height="150"'));
});

// ── Draft mechanism, end to end ──
// Drops a real draft post into posts/, runs the generators, and asserts the
// draft builds a noindex preview page while staying out of every listing.
// The finally block removes the draft and re-runs the generators, which
// restores (and prunes) everything even when an assertion failed.
console.log('\ndraft posts (integration)');
{
  const DRAFT_SLUG = 'zz-pipeline-test-draft';
  const DRAFT_TAG = 'zz-pipeline-test-draft-tag';
  const draftMd = join(ROOT, 'posts', `${DRAFT_SLUG}.md`);
  const run = (script) =>
    execFileSync('node', [join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'pipe' });
  // Self-heal residue from a run killed before its finally block (SIGKILL
  // skips finally): remove any leftover draft before starting.
  rmSync(draftMd, { force: true });
  rmSync(join(ROOT, 'writing', DRAFT_SLUG), { recursive: true, force: true });
  try {
    writeFileSync(draftMd, [
      '---',
      'title: "ZZ Pipeline Test Draft"',
      'subtitle: "Temporary post written by pipeline.test.mjs"',
      'date: 2026-01-01',
      'readTime: 1',
      `tags: ["${DRAFT_TAG}"]`,
      'draft: true',
      '---',
      'Draft body. If this file is committed, a test crashed; delete it.',
      '',
    ].join('\n'), 'utf-8');
    run('build-posts.mjs');
    run('generate-feed.mjs');

    test('draft still builds a preview page, with noindex', () => {
      const page = readFileSync(join(ROOT, 'writing', DRAFT_SLUG, 'index.html'), 'utf-8');
      assert(page.includes('<meta name="robots" content="noindex, nofollow">'), 'missing noindex');
      assert(page.includes(`https://jcosta.tech/writing/${DRAFT_SLUG}/`), 'missing canonical');
    });
    test('draft stays out of posts.json and tags.json', () => {
      assert(!readFileSync(join(ROOT, 'data', 'posts.json'), 'utf-8').includes(DRAFT_SLUG));
      assert(!readFileSync(join(ROOT, 'data', 'tags.json'), 'utf-8').includes(DRAFT_TAG));
    });
    test('draft creates no tag page', () => {
      assert(!existsSync(join(ROOT, 'writing', 'tags', DRAFT_TAG)));
    });
    test('draft stays out of feed.xml, sitemap.xml, and llms.txt', () => {
      for (const f of ['feed.xml', 'sitemap.xml', 'llms.txt']) {
        assert(!readFileSync(join(ROOT, f), 'utf-8').includes(DRAFT_SLUG), `${f} contains draft`);
      }
    });
  } finally {
    rmSync(draftMd, { force: true });
    // Regenerate without the draft: prunes the preview dir and undoes any
    // listing leak a failed assertion just reported.
    run('build-posts.mjs');
    run('generate-feed.mjs');
  }
  test('cleanup: preview dir pruned once the draft .md is gone', () => {
    assert(!existsSync(join(ROOT, 'writing', DRAFT_SLUG)));
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

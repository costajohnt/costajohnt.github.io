import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { replaceBetweenMarkers } from './embed-data.mjs';
import { escapeHtml } from './lib/html.mjs';
import { formatDate, formatStars, formatISODate } from './lib/format.mjs';
import { existsSync } from 'fs';
import { parseFrontmatter, flagIsTrue } from './lib/frontmatter.mjs';
import { monthlyCounts, buildSparklineSVG } from './lib/sparkline.mjs';
import { PROJECT_REPOS } from './lib/projects.mjs';
import { CHROME_PAGES } from './lib/pages.mjs';

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

console.log('escapeHtml');
test('escapes ampersands', () => assert.equal(escapeHtml('a&b'), 'a&amp;b'));
test('escapes angle brackets', () => assert.equal(escapeHtml('<script>'), '&lt;script&gt;'));
test('escapes quotes', () => assert.equal(escapeHtml('"hi"'), '&quot;hi&quot;'));
test('handles empty string', () => assert.equal(escapeHtml(''), ''));
test('handles null', () => assert.equal(escapeHtml(null), ''));
test('handles undefined', () => assert.equal(escapeHtml(undefined), ''));
test('coerces 0 to "0" instead of swallowing it', () => assert.equal(escapeHtml(0), '0'));
test('passes clean strings through', () => assert.equal(escapeHtml('hello world'), 'hello world'));

console.log('\nformatDate');
test('formats a date', () => assert.equal(formatDate('2026-03-14'), 'Mar 14, 2026'));
test('formats January', () => assert.equal(formatDate('2026-01-01'), 'Jan 1, 2026'));
test('formats December', () => assert.equal(formatDate('2025-12-25'), 'Dec 25, 2025'));

console.log('\nformatStars');
test('shows small numbers as-is', () => assert.equal(formatStars(42), '42'));
test('shows 999 as-is', () => assert.equal(formatStars(999), '999'));
test('shows 1000 as 1k', () => assert.equal(formatStars(1000), '1k'));
test('shows 1500 as 1.5k', () => assert.equal(formatStars(1500), '1.5k'));
test('shows 10000 as 10k', () => assert.equal(formatStars(10000), '10k'));
test('shows 35600 as 35.6k', () => assert.equal(formatStars(35600), '35.6k'));
test('shows 47000 as 47k', () => assert.equal(formatStars(47000), '47k'));
test('rounds to 1 decimal', () => assert.equal(formatStars(24050), '24.1k'));
test('never renders x.0k (83950 is 84k, not 84.0k)', () => assert.equal(formatStars(83950), '84k'));

console.log('\nformatISODate');
test('passes plain dates through', () => assert.equal(formatISODate('2026-06-08'), '2026-06-08'));
test('strips time components', () => assert.equal(formatISODate('2026-06-08T10:00:00Z'), '2026-06-08'));

console.log('\nformatDate with time component');
test('tolerates a time component', () => assert.equal(formatDate('2026-06-08T10:00:00Z'), 'Jun 8, 2026'));

console.log('\nparseFrontmatter');
test('parses scalars, quoted strings, arrays, and integers', () => {
  const { meta, content } = parseFrontmatter(
    '---\ntitle: "Hello World"\ndate: 2026-06-08\nreadTime: 6\ntags: ["a", "b"]\narchived: true\n---\nBody text.'
  );
  assert.equal(meta.title, 'Hello World');
  assert.equal(meta.date, '2026-06-08');
  assert.equal(meta.readTime, 6);
  assert.deepEqual(meta.tags, ['a', 'b']);
  assert.equal(meta.archived, 'true');
  assert.equal(content, 'Body text.');
});
test('returns raw content when no frontmatter', () => {
  const { meta, content } = parseFrontmatter('just text');
  assert.deepEqual(meta, {});
  assert.equal(content, 'just text');
});
test('does not coerce single-element numeric arrays to numbers', () => {
  const { meta } = parseFrontmatter('---\ntags: ["2026"]\n---\nx');
  assert.deepEqual(meta.tags, ['2026']);
});
test('keeps tags containing commas intact', () => {
  const { meta } = parseFrontmatter('---\ntags: ["one, two", "three"]\n---\nx');
  assert.deepEqual(meta.tags, ['one, two', 'three']);
});
test('only coerces known-numeric keys: numeric title stays a string', () => {
  const { meta } = parseFrontmatter('---\ntitle: 2026\nreadTime: 6\n---\nx');
  assert.equal(meta.title, '2026');
  assert.equal(meta.readTime, 6);
});

console.log('\nflagIsTrue');
test('accepts boolean true and the string "true"', () => {
  assert.equal(flagIsTrue(true), true);
  assert.equal(flagIsTrue('true'), true);
});
test('rejects everything else', () => {
  for (const v of [false, 'false', undefined, null, '', 'yes', 1]) {
    assert.equal(flagIsTrue(v), false, `expected flagIsTrue(${JSON.stringify(v)}) === false`);
  }
});

console.log('\nreplaceBetweenMarkers');
test('replaces content between markers', () => {
  const html = '<div><!-- BEGIN:TEST -->old<!-- END:TEST --></div>';
  const result = replaceBetweenMarkers(html, '<!-- BEGIN:TEST -->', '<!-- END:TEST -->', 'new');
  assert(result.includes('new'));
  assert(!result.includes('old'));
});
test('preserves markers', () => {
  const html = '<!-- BEGIN:X -->old<!-- END:X -->';
  const result = replaceBetweenMarkers(html, '<!-- BEGIN:X -->', '<!-- END:X -->', 'new');
  assert(result.includes('<!-- BEGIN:X -->'));
  assert(result.includes('<!-- END:X -->'));
});
test('throws on missing begin marker', () => {
  assert.throws(
    () => replaceBetweenMarkers('<div></div>', '<!-- BEGIN:X -->', '<!-- END:X -->', 'new'),
    /Markers not found/
  );
});
test('throws on missing end marker', () => {
  assert.throws(
    () => replaceBetweenMarkers('<!-- BEGIN:X -->', '<!-- BEGIN:X -->', '<!-- END:X -->', 'new'),
    /Markers not found/
  );
});
test('inserts $-sequences literally instead of expanding them', () => {
  const html = 'PREFIX<!-- BEGIN:X -->old<!-- END:X -->';
  for (const content of ['fix: $` injected', 'cost is $&', "tail $'", 'price $$1', 'group $1']) {
    const result = replaceBetweenMarkers(html, '<!-- BEGIN:X -->', '<!-- END:X -->', content);
    assert(result.includes(content), `expected literal ${JSON.stringify(content)} in output`);
  }
});
test('$-sequence content does not duplicate surrounding html', () => {
  const html = 'PREFIX<!-- BEGIN:X -->old<!-- END:X -->';
  const result = replaceBetweenMarkers(html, '<!-- BEGIN:X -->', '<!-- END:X -->', 'fix: $` bug');
  assert.equal(result.split('PREFIX').length - 1, 1, 'PREFIX must appear exactly once');
});

console.log('\nsparkline');
test('monthlyCounts buckets PRs into trailing months from the newest', () => {
  const prs = [
    { mergedAt: '2026-06-10T06:00:00Z' },
    { mergedAt: '2026-06-01T00:00:00Z' },
    { mergedAt: '2026-03-15T00:00:00Z' },
    { mergedAt: '2025-12-31T00:00:00Z' },
  ];
  const { months } = monthlyCounts(prs, 6);
  assert.equal(months.length, 6);
  assert.equal(months[0].key, '2026-01');
  assert.equal(months[5].key, '2026-06');
  assert.equal(months[5].count, 2);
  assert.equal(months[2].count, 1);
  assert.equal(months[0].count, 0); // Dec 2025 falls outside the window
});
test('monthlyCounts skips PRs without mergedAt', () => {
  const { months } = monthlyCounts([{ mergedAt: '2026-06-10T00:00:00Z' }, {}], 3);
  assert.equal(months.reduce((a, m) => a + m.count, 0), 1);
});
test('JAN year label survives labelEvery for every anchor month', () => {
  // The anchor shifts daily; an index-based skip used to drop JAN (and the
  // only year marker) whenever it landed on an odd index.
  for (let month = 1; month <= 12; month++) {
    const anchor = `2026-${String(month).padStart(2, '0')}-15T00:00:00Z`;
    const svg = buildSparklineSVG([{ mergedAt: anchor }], { monthCount: 18, labelEvery: 2 });
    assert(/JAN \d\d</.test(svg), `anchor month ${month}: no JAN year label in output`);
  }
});
test('sparkline handles empty data without NaN', () => {
  const svg = buildSparklineSVG([], { monthCount: 6 });
  assert(!svg.includes('NaN'));
  assert(svg.includes('<svg'));
});

console.log('\nHTML marker integrity');
test('index.html has all 5 marker pairs', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const name of ['HERO_CARD', 'OSS_STATS', 'OSS_REPOS', 'RECENT_PRS', 'POSTS']) {
    assert(html.includes(`<!-- BEGIN:${name} -->`), `Missing BEGIN:${name}`);
    assert(html.includes(`<!-- END:${name} -->`), `Missing END:${name}`);
  }
});
test('contributions.html has all 4 marker pairs', () => {
  const html = readFileSync(join(ROOT, 'contributions.html'), 'utf8');
  for (const name of ['CONTRIB_STATS', 'CONTRIB_CHART', 'CONTRIB_FILTERS', 'ALL_PRS']) {
    assert(html.includes(`<!-- BEGIN:${name} -->`), `Missing BEGIN:${name}`);
    assert(html.includes(`<!-- END:${name} -->`), `Missing END:${name}`);
  }
});
test('writing.html has the TAG_CLOUD and ALL_POSTS marker pairs', () => {
  const html = readFileSync(join(ROOT, 'writing.html'), 'utf8');
  for (const name of ['TAG_CLOUD', 'ALL_POSTS']) {
    assert(html.includes(`<!-- BEGIN:${name} -->`), `Missing BEGIN:${name}`);
    assert(html.includes(`<!-- END:${name} -->`), `Missing END:${name}`);
  }
});
test('index.html has a PROJ marker pair for every project repo', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const repo of PROJECT_REPOS) {
    assert(html.includes(`<!-- BEGIN:PROJ:${repo} -->`), `missing BEGIN:PROJ:${repo}`);
    assert(html.includes(`<!-- END:PROJ:${repo} -->`), `missing END:PROJ:${repo}`);
  }
});
test('every CHROME_PAGES file exists with NAV, FOOTER, and HEAD marker pairs', () => {
  for (const page of CHROME_PAGES) {
    assert(existsSync(join(ROOT, page)), `${page}: listed in CHROME_PAGES but missing on disk`);
    const html = readFileSync(join(ROOT, page), 'utf8');
    for (const name of ['NAV', 'FOOTER', 'HEAD_COMMON', 'HEAD_FONTS']) {
      assert(html.includes(`<!-- BEGIN:${name} -->`), `${page}: missing BEGIN:${name}`);
      assert(html.includes(`<!-- END:${name} -->`), `${page}: missing END:${name}`);
    }
  }
});

console.log('\nData file structure');
test('posts.json has valid structure', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'data', 'posts.json'), 'utf8'));
  assert(Array.isArray(data.posts));
  assert(data.posts.length > 0);
  for (const p of data.posts) {
    for (const key of ['title', 'subtitle', 'date', 'readTime', 'url']) {
      assert(key in p, `Missing key: ${key} in ${p.url || JSON.stringify(p)}`);
    }
    assert(typeof p.title === 'string' && p.title.length > 0, `empty title in ${p.url}`);
    assert(typeof p.url === 'string' && p.url.length > 0, `empty url for "${p.title}"`);
    assert(!Number.isNaN(Date.parse(p.date)), `unparseable date in ${p.url}: ${p.date}`);
  }
});
test('oss-stats.json has valid structure', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'data', 'oss-stats.json'), 'utf8'));
  assert(data.stats);
  assert(Array.isArray(data.contributions));
  assert(data.stats.prsMerged > 0);
});
test('merged-prs.json has valid structure', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'data', 'merged-prs.json'), 'utf8'));
  assert(Array.isArray(data.prs));
  assert(data.prs.length > 0);
  for (const pr of data.prs) {
    for (const key of ['url', 'title', 'mergedAt', 'repo', 'number', 'stars', 'language']) {
      assert(key in pr, `Missing key: ${key} in ${pr.url || JSON.stringify(pr)}`);
    }
    assert(typeof pr.title === 'string' && pr.title.length > 0, `empty title in ${pr.url}`);
    assert(typeof pr.url === 'string' && pr.url.length > 0, `empty url for "${pr.title}"`);
    assert(!Number.isNaN(Date.parse(pr.mergedAt)), `unparseable mergedAt in ${pr.url}: ${pr.mergedAt}`);
    assert(typeof pr.stars === 'number', `non-numeric stars in ${pr.url}`);
    assert(typeof pr.number === 'number', `non-numeric number in ${pr.url}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

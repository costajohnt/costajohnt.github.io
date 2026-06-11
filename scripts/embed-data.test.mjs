import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { replaceBetweenMarkers } from './embed-data.mjs';
import { escapeHtml } from './lib/html.mjs';
import { formatDate, formatStars, formatISODate } from './lib/format.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';

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

console.log('\nHTML marker integrity');
test('index.html has all 4 marker pairs', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const name of ['OSS_STATS', 'OSS_REPOS', 'RECENT_PRS', 'POSTS']) {
    assert(html.includes(`<!-- BEGIN:${name} -->`), `Missing BEGIN:${name}`);
    assert(html.includes(`<!-- END:${name} -->`), `Missing END:${name}`);
  }
});
test('contributions.html has all 2 marker pairs', () => {
  const html = readFileSync(join(ROOT, 'contributions.html'), 'utf8');
  for (const name of ['CONTRIB_STATS', 'ALL_PRS']) {
    assert(html.includes(`<!-- BEGIN:${name} -->`), `Missing BEGIN:${name}`);
    assert(html.includes(`<!-- END:${name} -->`), `Missing END:${name}`);
  }
});
test('every chrome page has NAV and FOOTER marker pairs', () => {
  for (const page of ['index.html', 'about.html', 'contact.html', 'writing.html', 'testimonials.html', 'contributions.html', '404.html']) {
    const html = readFileSync(join(ROOT, page), 'utf8');
    for (const name of ['NAV', 'FOOTER']) {
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
  const p = data.posts[0];
  for (const key of ['title', 'subtitle', 'date', 'readTime', 'url']) {
    assert(key in p, `Missing key: ${key}`);
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
  const pr = data.prs[0];
  for (const key of ['url', 'title', 'mergedAt', 'repo', 'number', 'stars', 'language']) {
    assert(key in pr, `Missing key: ${key}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

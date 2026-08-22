import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { slugifyTag } from './lib/format.mjs';
import { escapeXml, toRfc822 } from './lib/xml.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'posts');
const OUTPUT = join(ROOT, 'feed.xml');
const SITEMAP_OUTPUT = join(ROOT, 'sitemap.xml');
const LLMS_OUTPUT = join(ROOT, 'llms.txt');

const SITE_URL = 'https://jcosta.tech';
const FEED_URL = `${SITE_URL}/feed.xml`;
const MIN_TAG_POSTS_FOR_INDEX = 3;
const FEED_TITLE = 'John Costa — The Engineering Product';
const FEED_DESCRIPTION = 'Writing on AI-augmented engineering, open source, and building in public.';

function slugFromFilename(filename) {
  return basename(filename, '.md');
}

function loadPosts() {
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = [];

  for (const file of files) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const { meta } = parseFrontmatter(content);
    if (!meta.date || !meta.title) continue;
    // Same normalization as build-posts.mjs: archived posts stay reachable at
    // their URL but leave the feed, matching posts.json and writing.html.
    if (meta.archived === true || meta.archived === 'true') continue;

    const slug = slugFromFilename(file);
    posts.push({ ...meta, slug });
  }

  // Sort by date descending
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

function buildFeed(posts) {
  const now = new Date().toUTCString();

  const items = posts.map(post => {
    const url = `${SITE_URL}/writing/${post.slug}/`;
    const description = post.subtitle || post.seoDescription || '';
    const pubDate = toRfc822(post.date);

    // RSS enclosures require the real byte length; covers are local files, so
    // stat them. A missing file means no enclosure rather than a broken one.
    let enclosure = '';
    if (post.cover) {
      const coverUrl = `${SITE_URL}${post.cover}`;
      const coverFile = join(ROOT, post.cover);
      if (existsSync(coverFile)) {
        let imageType = 'image/png';
        if (coverUrl.endsWith('.jpg') || coverUrl.endsWith('.jpeg')) imageType = 'image/jpeg';
        else if (coverUrl.endsWith('.webp')) imageType = 'image/webp';
        const length = statSync(coverFile).size;
        enclosure = `\n      <enclosure url="${escapeXml(coverUrl)}" type="${imageType}" length="${length}" />`;
      } else {
        console.warn(`  Warning: cover not found for ${post.slug}: ${post.cover} (enclosure omitted)`);
      }
    }

    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>${enclosure}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(FEED_URL)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function buildSitemap(posts) {
  // `updated:` frontmatter overrides the publication date for lastmod, so an
  // edited older post can carry the newest date. data/merged-prs.json is
  // sorted by date descending.
  const lastmodOf = (p) => p.updated || p.date;
  const newestPostDate = posts.length
    ? posts.map(lastmodOf).sort().pop()
    : null;
  let newestPrDate = null;
  try {
    const prs = JSON.parse(readFileSync(join(ROOT, 'data', 'merged-prs.json'), 'utf-8')).prs || [];
    if (prs.length && prs[0].mergedAt) newestPrDate = prs[0].mergedAt.slice(0, 10);
  } catch (err) {
    console.warn(`  Warning: could not read merged-prs.json for sitemap lastmod: ${err.message}`);
  }
  const homeLastmod = [newestPostDate, newestPrDate].filter(Boolean).sort().pop() || null;

  // lastmod reflects when content actually changed: post pages use their
  // updated (or publication) date, the listing pages use the newest item they show, and
  // rarely-edited static pages carry no lastmod rather than a fake one.
  const entry = (path, lastmod) =>
    `  <url>\n    <loc>${escapeXml(SITE_URL + path)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;

  // Tag landing pages: lastmod = newest post carrying the tag. Tags with fewer
  // than MIN_TAG_POSTS_FOR_INDEX posts are thin pages that outrank the posts
  // they link to, so they stay out of the sitemap and carry noindex
  // (scripts/build-posts.mjs applies the same threshold).
  const tagDates = new Map();
  const tagCounts = new Map();
  for (const p of posts) {
    for (const t of Array.isArray(p.tags) ? p.tags : []) {
      const slug = slugifyTag(t);
      if (!slug) continue;
      if (!tagDates.has(slug) || lastmodOf(p) > tagDates.get(slug)) tagDates.set(slug, lastmodOf(p));
      tagCounts.set(slug, (tagCounts.get(slug) || 0) + 1);
    }
  }
  const tagEntries = [...tagDates.entries()]
    .filter(([slug]) => tagCounts.get(slug) >= MIN_TAG_POSTS_FOR_INDEX)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, date]) => entry(`/writing/tags/${slug}/`, date));

  const urls = [
    entry('/', homeLastmod),
    entry('/writing.html', newestPostDate),
    entry('/contributions.html', newestPrDate),
    entry('/about.html', null),
    entry('/testimonials.html', null),
    entry('/contact.html', null),
    ...posts.map((p) => entry(`/writing/${p.slug}/`, lastmodOf(p))),
    ...tagEntries,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

// Skip the write when nothing but volatile fields changed, so daily rebuilds
// with unchanged content produce no git diff (and therefore no churn commit).
function writeIfChanged(path, content, { ignore } = {}) {
  let existing = null;
  try {
    existing = readFileSync(path, 'utf-8');
  } catch {
    // Missing file: always write.
  }
  if (existing !== null) {
    const norm = (s) => (ignore ? s.replace(ignore, '') : s);
    if (norm(existing) === norm(content)) return false;
  }
  writeFileSync(path, content, 'utf-8');
  return true;
}

function buildLlmsTxt(posts) {
  let stats = null;
  try {
    stats = JSON.parse(readFileSync(join(ROOT, 'data', 'oss-stats.json'), 'utf-8')).stats;
  } catch (err) {
    console.warn(`  Warning: could not read oss-stats.json for llms.txt: ${err.message}`);
  }

  const statsLine = stats
    ? ` ${stats.prsMerged} merged pull requests across ${stats.repos} open source repositories in ${stats.languages} languages, tracked live at /contributions.html.`
    : '';

  const postLines = posts.map((p) => {
    const desc = p.subtitle || p.seoDescription || '';
    // Square brackets in a title would break the markdown link syntax
    const title = String(p.title).replace(/([[\]])/g, '\\$1');
    return `- [${title}](${SITE_URL}/writing/${p.slug}/): ${desc} (${p.date}; raw markdown at ${SITE_URL}/writing/${p.slug}/index.md)`;
  });

  return `# John Costa — jcosta.tech

> Personal site of John Costa, a software engineer and AI-augmented builder in Oakland, CA. Writing on AI-assisted engineering, open source, and building in public.${statsLine}

Every blog post is also available as raw markdown: append index.md to the post URL.

## Writing

${postLines.join('\n')}

## Key pages

- [Home](${SITE_URL}/): bio, live OSS stats, recent merged PRs, selected writing
- [Writing index](${SITE_URL}/writing.html): all posts
- [Open source contributions](${SITE_URL}/contributions.html): every merged PR with repo, stars, language
- [About](${SITE_URL}/about.html)
- [Testimonials](${SITE_URL}/testimonials.html)
- [Contact](${SITE_URL}/contact.html): consulting, advisory engagements, open source collaboration
- [RSS feed](${SITE_URL}/feed.xml)
`;
}

const posts = loadPosts();

const feedChanged = writeIfChanged(OUTPUT, buildFeed(posts), {
  ignore: /<lastBuildDate>[^<]*<\/lastBuildDate>/,
});
console.log(
  feedChanged
    ? `Generated ${OUTPUT} with ${posts.length} posts`
    : `Feed unchanged (${posts.length} posts); skipped write`
);

const sitemapContent = buildSitemap(posts);
const sitemapUrlCount = (sitemapContent.match(/<loc>/g) || []).length;
const sitemapChanged = writeIfChanged(SITEMAP_OUTPUT, sitemapContent);
console.log(
  sitemapChanged
    ? `Generated ${SITEMAP_OUTPUT} with ${sitemapUrlCount} URLs`
    : `Sitemap unchanged (${sitemapUrlCount} URLs); skipped write`
);

const llmsChanged = writeIfChanged(LLMS_OUTPUT, buildLlmsTxt(posts));
console.log(
  llmsChanged
    ? `Generated ${LLMS_OUTPUT} with ${posts.length} posts`
    : `llms.txt unchanged (${posts.length} posts); skipped write`
);

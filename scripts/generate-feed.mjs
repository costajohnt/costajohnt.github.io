import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'posts');
const OUTPUT = join(ROOT, 'feed.xml');
const SITEMAP_OUTPUT = join(ROOT, 'sitemap.xml');

const SITE_URL = 'https://jcosta.tech';
const FEED_URL = `${SITE_URL}/feed.xml`;
const FEED_TITLE = 'John Costa — The Engineering Product';
const FEED_DESCRIPTION = 'Writing on AI-augmented engineering, open source, and building in public.';

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toUTCString();
}

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
  // posts arrive sorted by date descending; data/merged-prs.json likewise.
  const newestPostDate = posts.length ? posts[0].date : null;
  let newestPrDate = null;
  try {
    const prs = JSON.parse(readFileSync(join(ROOT, 'data', 'merged-prs.json'), 'utf-8')).prs || [];
    if (prs.length && prs[0].mergedAt) newestPrDate = prs[0].mergedAt.slice(0, 10);
  } catch (err) {
    console.warn(`  Warning: could not read merged-prs.json for sitemap lastmod: ${err.message}`);
  }
  const homeLastmod = [newestPostDate, newestPrDate].filter(Boolean).sort().pop() || null;

  // lastmod reflects when content actually changed: post pages use their
  // publication date, the listing pages use the newest item they show, and
  // rarely-edited static pages carry no lastmod rather than a fake one.
  const entry = (path, lastmod) =>
    `  <url>\n    <loc>${escapeXml(SITE_URL + path)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;

  const urls = [
    entry('/', homeLastmod),
    entry('/writing.html', newestPostDate),
    entry('/contributions.html', newestPrDate),
    entry('/about.html', null),
    entry('/testimonials.html', null),
    entry('/contact.html', null),
    ...posts.map((p) => entry(`/writing/${p.slug}/`, p.date)),
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

const posts = loadPosts();

const feedChanged = writeIfChanged(OUTPUT, buildFeed(posts), {
  ignore: /<lastBuildDate>[^<]*<\/lastBuildDate>/,
});
console.log(
  feedChanged
    ? `Generated ${OUTPUT} with ${posts.length} posts`
    : `Feed unchanged (${posts.length} posts); skipped write`
);

const sitemapChanged = writeIfChanged(SITEMAP_OUTPUT, buildSitemap(posts));
console.log(
  sitemapChanged
    ? `Generated ${SITEMAP_OUTPUT} with ${posts.length + 6} URLs`
    : `Sitemap unchanged (${posts.length + 6} URLs); skipped write`
);

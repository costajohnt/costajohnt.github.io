import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'posts');
const OUTPUT = join(ROOT, 'feed.xml');

const SITE_URL = 'https://jcosta.tech';
const FEED_URL = `${SITE_URL}/feed.xml`;
const FEED_TITLE = 'John Costa — The Engineering Product';
const FEED_DESCRIPTION = 'Writing on AI-augmented engineering, open source, and building in public.';

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const raw = match[1];
  const meta = {};

  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse arrays like ["tag1", "tag2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''));
    }

    meta[key] = value;
  }

  return meta;
}

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
    const meta = parseFrontmatter(content);
    if (!meta || !meta.date || !meta.title) continue;
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

const posts = loadPosts();
writeFileSync(OUTPUT, buildFeed(posts), 'utf-8');
console.log(`Generated ${OUTPUT} with ${posts.length} posts`);

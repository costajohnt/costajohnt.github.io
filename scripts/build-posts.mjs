/**
 * build-posts.mjs
 *
 * Converts markdown blog posts in posts/ into standalone HTML pages
 * at writing/{slug}/index.html, and generates data/posts.json from
 * the frontmatter.
 *
 * Usage: node scripts/build-posts.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { escapeHtml } from './lib/html.mjs';
import { formatDate, formatISODate } from './lib/format.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const POSTS_DIR = join(ROOT, 'posts');
const WRITING_DIR = join(ROOT, 'writing');
const DATA_DIR = join(ROOT, 'data');

// Shared page chrome; single source of truth in partials/, also injected
// into the static pages by embed-data.mjs via NAV/FOOTER markers.
const NAV_HTML = readFileSync(join(ROOT, 'partials', 'nav.html'), 'utf-8');
const FOOTER_HTML = readFileSync(join(ROOT, 'partials', 'footer.html'), 'utf-8');

// ── Markdown rendering ──────────────────────────────────────────────

// Custom renderer for code blocks with language labels
const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
  const escaped = escapeHtml(text);
  const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
  return `<pre${langAttr}><code>${escaped}</code></pre>\n`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false,
});

// ── Helpers ─────────────────────────────────────────────────────────

function slugFromFilename(filename) {
  return basename(filename, '.md');
}

/** Sort comparator: newest ISO date string first. */
function compareDatesDesc(a, b) {
  if (a.date > b.date) return -1;
  if (a.date < b.date) return 1;
  return 0;
}

// ── Related posts ──────────────────────────────────────────────────

function computeRelatedPosts(allPostsMeta, currentSlug, maxRelated = 3) {
  const current = allPostsMeta.find(p => p.slug === currentSlug);
  if (!current || !current.tags || current.tags.length === 0) return [];

  const currentTags = new Set(current.tags);

  return allPostsMeta
    .filter(p => p.slug !== currentSlug && !p.archived)
    .map(p => {
      const overlap = (p.tags || []).filter(t => currentTags.has(t)).length;
      return { ...p, overlap };
    })
    .filter(p => p.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || compareDatesDesc(a, b))
    .slice(0, maxRelated);
}

function generateRelatedPostsHTML(relatedPosts) {
  if (relatedPosts.length === 0) return '';

  const items = relatedPosts.map(p => {
    const thumb = p.coverImage
      ? `<img src="${escapeHtml(p.coverImage)}" alt="" class="related-post-thumb" loading="lazy">`
      : `<div class="related-post-thumb related-post-thumb-empty"></div>`;
    return [
      `          <a href="${escapeHtml(p.url)}" class="related-post-item">`,
      `            ${thumb}`,
      `            <div>`,
      `              <h3>${escapeHtml(p.title)}</h3>`,
      `              <span class="related-post-time">${escapeHtml(p.readTime)}</span>`,
      `            </div>`,
      `          </a>`,
    ].join('\n');
  }).join('\n');

  return [
    `      <div class="related-posts">`,
    `        <p class="related-posts-heading">Keep reading</p>`,
    `        <div class="related-posts-list">`,
    items,
    `        </div>`,
    `      </div>`,
  ].join('\n');
}

// ── HTML template ───────────────────────────────────────────────────

function buildPostHTML(meta, bodyHTML, slug, relatedPosts = []) {
  const title = (meta.title || 'Untitled').trim();
  const subtitle = meta.subtitle || '';
  const date = meta.date ? formatDate(meta.date) : '';
  const isoDate = meta.date ? formatISODate(meta.date) : '';
  const readTime = meta.readTime ? `${meta.readTime} min read` : '';
  const cover = meta.cover || '';
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const seoTitle = meta.seoTitle || title;
  const seoDescription = meta.seoDescription || subtitle || '';
  const canonicalUrl = `https://jcosta.tech/writing/${slug}/`;
  const coverUrl = cover ? `https://jcosta.tech${cover}` : 'https://jcosta.tech/assets/social-card.png';

  const coverHTML = cover
    ? `<img class="post-cover" src="${escapeHtml(cover)}" alt="${escapeHtml(title)}">`
    : '';

  const subtitleHTML = subtitle
    ? `<p class="post-subtitle">${escapeHtml(subtitle)}</p>`
    : '';

  const tagsHTML = tags.length > 0
    ? `<div class="post-tags">${tags.map(t => `<span class="post-tag">${escapeHtml(t.trim())}</span>`).join('\n          ')}</div>`
    : '';

  const metaSep = (date && readTime) ? '<span class="post-meta-sep">&middot;</span>' : '';

  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: seoDescription,
    image: coverUrl,
    datePublished: isoDate,
    author: {
      '@type': 'Person',
      name: 'John Costa',
      url: 'https://jcosta.tech',
    },
    publisher: {
      '@type': 'Person',
      name: 'John Costa',
      url: 'https://jcosta.tech',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  }, null, 2).replace(/<\//g, '<\\/');  // Prevent </script> injection

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-T38Z7YLEET"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-T38Z7YLEET');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seoTitle)} | John Costa</title>

  <meta name="description" content="${escapeHtml(seoDescription)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:image" content="${escapeHtml(coverUrl)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="John Costa">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta name="twitter:image" content="${escapeHtml(coverUrl)}">

  <script type="application/ld+json">
  ${structuredData}
  </script>

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/styles/post.css">
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to content</a>
  ${NAV_HTML}

  <main id="main-content" class="container">
    <article>
      <header class="post-hero">
        ${coverHTML}
        <div class="post-meta">
          ${date ? `<span class="post-date">${date}</span>` : ''}
          ${metaSep}
          ${readTime ? `<span class="post-read-time">${readTime}</span>` : ''}
        </div>
        <h1 class="post-title">${escapeHtml(title)}</h1>
        ${subtitleHTML}
        ${tagsHTML}
      </header>

      <div class="post-body">
        ${bodyHTML}
      </div>
    </article>

    <div class="post-endmatter">
      <div class="post-share">
        <button type="button" class="copy-link-btn" id="copy-link-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Copy link</span>
        </button>
      </div>

${generateRelatedPostsHTML(relatedPosts)}
    </div>

    <div class="post-footer">
      <a href="/" class="post-back-link">&larr; Back to home</a>
    </div>
    ${FOOTER_HTML}
  </main>

  <script>
    (function () {
      var btn = document.getElementById('copy-link-btn');
      if (!btn) return;
      var label = btn.querySelector('span');
      btn.addEventListener('click', function () {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          label.textContent = 'Copy failed';
          setTimeout(function () { label.textContent = 'Copy link'; }, 2000);
          return;
        }
        navigator.clipboard.writeText(window.location.href).then(function () {
          label.textContent = 'Copied!';
          setTimeout(function () { label.textContent = 'Copy link'; }, 2000);
        }).catch(function () {
          label.textContent = 'Copy failed';
          setTimeout(function () { label.textContent = 'Copy link'; }, 2000);
        });
      });
    })();
  </script>
</body>
</html>`;
}

// ── Build ───────────────────────────────────────────────────────────

function buildPosts() {
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort();

  if (files.length === 0) {
    console.log('No markdown files found in posts/');
    return;
  }

  // First pass: parse all posts and collect metadata (needed for related posts)
  const allPosts = [];
  for (const file of files) {
    const slug = slugFromFilename(file);
    const raw = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const { meta, content } = parseFrontmatter(raw);
    const bodyHTML = marked(content);
    const tags = Array.isArray(meta.tags) ? meta.tags : [];
    allPosts.push({ slug, meta, bodyHTML, tags });
  }

  // Build metadata for related post lookups and posts.json
  const postsMeta = allPosts.map(p => ({
    slug: p.slug,
    title: (p.meta.title || '').trim(),
    subtitle: p.meta.subtitle || '',
    date: formatISODate(p.meta.date || ''),
    readTime: p.meta.readTime ? `${p.meta.readTime} min` : '',
    url: `/writing/${p.slug}/`,
    coverImage: p.meta.cover || '',
    tags: p.tags,
    archived: p.meta.archived === true || p.meta.archived === 'true',
  }));

  postsMeta.sort(compareDatesDesc);

  // Second pass: render HTML pages with related posts
  for (const post of allPosts) {
    const relatedPosts = computeRelatedPosts(postsMeta, post.slug);
    const html = buildPostHTML(post.meta, post.bodyHTML, post.slug, relatedPosts);

    const outDir = join(WRITING_DIR, post.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf-8');
    console.log(`  built: writing/${post.slug}/index.html`);
  }

  // Prune generated pages whose source post was deleted or renamed, so the
  // old URL doesn't stay live with a stale canonical. Only pages carrying
  // this generator's fingerprint (the canonical link the template always
  // emits) are deleted; anything else gets a loud warning instead.
  const validSlugs = new Set(allPosts.map((p) => p.slug));
  for (const entry of readdirSync(WRITING_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || validSlugs.has(entry.name)) continue;
    const dir = join(WRITING_DIR, entry.name);
    const indexPath = join(dir, 'index.html');
    const fingerprint = `<link rel="canonical" href="https://jcosta.tech/writing/${entry.name}/">`;
    if (!existsSync(indexPath) || !readFileSync(indexPath, 'utf-8').includes(fingerprint)) {
      console.warn(`  warning: writing/${entry.name}/ has no posts/ source but doesn't look generated; leaving it alone`);
      continue;
    }
    rmSync(dir, { recursive: true });
    console.log(`  pruned: writing/${entry.name}/ (no posts/${entry.name}.md)`);
  }

  // Write data/posts.json (strip tags, slug, and archived — not needed downstream)
  const visiblePosts = postsMeta.filter(p => !p.archived);
  const postsJSON = JSON.stringify({
    posts: visiblePosts.map(({ tags, slug, archived, ...rest }) => rest),
  }, null, 2) + '\n';
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, 'posts.json'), postsJSON, 'utf-8');

  console.log(`\n  wrote: data/posts.json (${visiblePosts.length} posts, ${postsMeta.length - visiblePosts.length} archived)`);
  console.log('  done.');
}

buildPosts();

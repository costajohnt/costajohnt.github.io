/**
 * build-posts.mjs
 *
 * Converts markdown blog posts in posts/ into standalone HTML pages
 * at writing/{slug}/index.html, and generates data/posts.json from
 * the frontmatter.
 *
 * Usage: node scripts/build-posts.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const POSTS_DIR = join(ROOT, 'posts');
const WRITING_DIR = join(ROOT, 'writing');
const DATA_DIR = join(ROOT, 'data');

// ── Frontmatter parser ──────────────────────────────────────────────

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1];
    let value = kvMatch[2].trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse arrays like ["tag1", "tag2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value);
      } catch {
        // Keep as string if parse fails
      }
    }

    // Parse numbers (for readTime)
    if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    meta[key] = value;
  }

  return { meta, content: match[2] };
}

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

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const str = String(dateStr);
  const [year, month, day] = str.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatISODate(dateStr) {
  const str = String(dateStr);
  // Ensure YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str.split('T')[0];
}

function slugFromFilename(filename) {
  return basename(filename, '.md');
}

// ── HTML template ───────────────────────────────────────────────────

function buildPostHTML(meta, bodyHTML, slug) {
  const title = meta.title || 'Untitled';
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
  }, null, 2);

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
  <meta property="og:image" content="${coverUrl}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="John Costa">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta name="twitter:image" content="${coverUrl}">

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
  <nav>
    <a href="/" class="nav-name">John Costa</a>
    <button class="hamburger" aria-expanded="false" aria-label="Open menu">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
  </nav>
  <ul class="nav-links">
    <li><a href="/#writing"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>Writing</a></li>
    <li><a href="/#oss"><svg class="nav-icon" viewBox="-13.28 -21.779 32 32" fill="currentColor"><path d="M2.72-20.806c-8.572 0-15.52 6.95-15.52 15.52 0 6.653 4.188 12.327 10.07 14.534L.845-.29c-2.022-.76-3.462-2.71-3.462-4.996 0-2.946 2.39-5.335 5.335-5.335s5.335 2.39 5.335 5.335c0 2.287-1.44 4.237-3.462 4.996L8.17 9.25c5.883-2.207 10.07-7.88 10.07-14.534 0-8.57-6.95-15.52-15.52-15.52z"/></svg>Open Source</a></li>
    <li><a href="https://github.com/costajohnt"><svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>GitHub</a></li>
    <li><a href="/#testimonials"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Colleagues</a></li>
    <li><a href="mailto:costajohnt@gmail.com" class="nav-cta"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>Let's build something</a></li>
  </ul>

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

    <footer class="post-footer">
      <a href="/" class="post-back-link">&larr; Back to home</a>
      <p class="footer-copy"><a href="/">Home</a> &middot; <a href="/about.html">About</a> &middot; <a href="/contributions.html">Open Source</a> &middot; <a href="/testimonials.html">Testimonials</a></p>
      <p class="footer-copy">&copy; 2026 John Costa</p>
    </footer>
  </main>

  <script>
    (function () {
      var hamburger = document.querySelector('.hamburger');
      var navLinks = document.querySelector('.nav-links');
      if (!hamburger || !navLinks) return;

      function open() {
        hamburger.classList.add('active');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.setAttribute('aria-label', 'Close menu');
        navLinks.classList.add('open');
        document.body.style.overflow = 'hidden';
      }

      function close() {
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open menu');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      }

      hamburger.addEventListener('click', function () {
        var isOpen = hamburger.classList.contains('active');
        isOpen ? close() : open();
      });

      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', close);
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

  const postsData = [];

  for (const file of files) {
    const slug = slugFromFilename(file);
    const raw = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const { meta, content } = parseFrontmatter(raw);

    // Render markdown to HTML
    const bodyHTML = marked(content);

    // Build the full HTML page
    const html = buildPostHTML(meta, bodyHTML, slug);

    // Write to writing/{slug}/index.html
    const outDir = join(WRITING_DIR, slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf-8');

    console.log(`  built: writing/${slug}/index.html`);

    // Collect data for posts.json
    const cover = meta.cover || '';
    postsData.push({
      title: (meta.title || '').trim(),
      subtitle: meta.subtitle || '',
      date: formatISODate(meta.date || ''),
      readTime: meta.readTime ? `${meta.readTime} min` : '',
      url: `/writing/${slug}/`,
      coverImage: cover,
    });
  }

  // Sort posts by date descending (newest first)
  postsData.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  // Write data/posts.json
  mkdirSync(DATA_DIR, { recursive: true });
  const postsJSON = JSON.stringify({ posts: postsData }, null, 2) + '\n';
  writeFileSync(join(DATA_DIR, 'posts.json'), postsJSON, 'utf-8');

  console.log(`\n  wrote: data/posts.json (${postsData.length} posts)`);
  console.log('  done.');
}

buildPosts();

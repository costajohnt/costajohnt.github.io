/**
 * cross-post-devto.mjs
 *
 * Cross-posts a markdown blog post to Dev.to as a draft (or published).
 *
 * Usage:
 *   node scripts/cross-post-devto.mjs claude-code-tips-and-tricks
 *   node scripts/cross-post-devto.mjs claude-code-tips-and-tricks --publish
 *   node scripts/cross-post-devto.mjs --all
 *   node scripts/cross-post-devto.mjs --all --dry-run
 *
 * Environment:
 *   DEVTO_API_KEY — Dev.to API key (required)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'posts');

const SITE_URL = 'https://jcosta.tech';
const DEVTO_API = 'https://dev.to/api/articles';

// ── Tag formatting ──────────────────────────────────────────────────

/**
 * Dev.to tags: max 4, lowercase, no special chars, no hyphens.
 * Convert kebab-case to camelCase for multi-word tags.
 */
function formatDevtoTags(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .slice(0, 4)
    .map(tag => {
      const clean = tag.toLowerCase().replace(/[^a-z0-9-]/g, '');
      // Convert kebab-case to camelCase
      return clean.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
    })
    .filter(Boolean);
}

// ── Post loading ────────────────────────────────────────────────────

function loadPost(slug) {
  const filePath = join(POSTS_DIR, `${slug}.md`);
  let raw;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Post not found: ${filePath}`);
      process.exit(1);
    }
    throw err;
  }

  return parseFrontmatter(raw);
}

function listAllSlugs() {
  return readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => basename(f, '.md'))
    .filter(slug => {
      const { meta } = loadPost(slug);
      return !(meta.archived === true || meta.archived === 'true');
    });
}

// ── API ─────────────────────────────────────────────────────────────

async function checkDevtoDuplicate(canonicalUrl) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return false;
  try {
    const response = await fetch('https://dev.to/api/articles/me/all?per_page=100', {
      headers: { 'api-key': apiKey },
    });
    if (!response.ok) return false;
    const articles = await response.json();
    return articles.some((a) => a.canonical_url === canonicalUrl);
  } catch {
    return false;
  }
}

async function postToDevto(slug, { publish, dryRun }) {
  const { meta, content } = loadPost(slug);
  const canonicalUrl = `${SITE_URL}/writing/${slug}/`;

  // Check for duplicates
  if (!dryRun) {
    const exists = await checkDevtoDuplicate(canonicalUrl);
    if (exists) {
      console.log(`  Skipping: already exists on Dev.to (${canonicalUrl})`);
      return;
    }
  }
  const attribution = `*Originally published at [jcosta.tech](${canonicalUrl})*\n\n---\n\n`;
  const bodyMarkdown = attribution + content;

  const tags = formatDevtoTags(meta.tags);
  const mainImage = meta.cover ? `${SITE_URL}${meta.cover}` : undefined;

  const article = {
    title: meta.title,
    body_markdown: bodyMarkdown,
    canonical_url: canonicalUrl,
    tags,
    published: publish,
    description: meta.seoDescription || meta.subtitle || '',
  };

  if (mainImage) {
    article.main_image = mainImage;
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would post to Dev.to:`);
    console.log(`  Title:         ${article.title}`);
    console.log(`  Tags:          ${tags.join(', ')}`);
    console.log(`  Published:     ${publish}`);
    console.log(`  Canonical URL: ${canonicalUrl}`);
    console.log(`  Main image:    ${mainImage || '(none)'}`);
    console.log(`  Description:   ${article.description}`);
    console.log(`  Body length:   ${bodyMarkdown.length} chars`);
    return;
  }

  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.error('Missing DEVTO_API_KEY environment variable.');
    process.exit(1);
  }

  const response = await fetch(DEVTO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({ article }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Dev.to API error (${response.status}): ${text}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log(`Posted to Dev.to: ${data.url}`);
  return data;
}

// ── CLI ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const positional = args.filter(a => !a.startsWith('--'));

  const publish = flags.has('--publish');
  const dryRun = flags.has('--dry-run');
  const all = flags.has('--all');

  if (!all && positional.length === 0) {
    console.error('Usage: node scripts/cross-post-devto.mjs <slug> [--publish] [--dry-run]');
    console.error('       node scripts/cross-post-devto.mjs --all [--publish] [--dry-run]');
    process.exit(1);
  }

  const slugs = all ? listAllSlugs() : [positional[0]];

  for (const slug of slugs) {
    console.log(`\nProcessing: ${slug}`);
    await postToDevto(slug, { publish, dryRun });
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

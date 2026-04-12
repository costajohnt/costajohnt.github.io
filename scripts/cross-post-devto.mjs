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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'posts');

const SITE_URL = 'https://jcosta.tech';
const DEVTO_API = 'https://dev.to/api/articles';

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

    // Parse numbers
    if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    meta[key] = value;
  }

  return { meta, content: match[2] };
}

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
    .map(f => basename(f, '.md'));
}

// ── API ─────────────────────────────────────────────────────────────

async function postToDevto(slug, { publish, dryRun }) {
  const { meta, content } = loadPost(slug);
  const canonicalUrl = `${SITE_URL}/writing/${slug}/`;
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

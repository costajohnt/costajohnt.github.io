/**
 * cross-post-hashnode.mjs
 *
 * Cross-posts a markdown blog post to Hashnode via their GraphQL API.
 *
 * Usage:
 *   node scripts/cross-post-hashnode.mjs claude-code-tips-and-tricks
 *   node scripts/cross-post-hashnode.mjs --all
 *   node scripts/cross-post-hashnode.mjs --all --dry-run
 *
 * Environment:
 *   HASHNODE_TOKEN  — Hashnode personal access token (required)
 *   HASHNODE_PUB_ID — Hashnode publication ID (required)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'posts');

const SITE_URL = 'https://jcosta.tech';
const HASHNODE_API = 'https://gql.hashnode.com';

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
 * Hashnode tags: array of { name, slug } objects.
 */
function formatHashnodeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return tags.map(tag => ({
    name: tag,
    slug: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  }));
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

// ── GraphQL ─────────────────────────────────────────────────────────

const PUBLISH_POST_MUTATION = `
  mutation PublishPost($input: PublishPostInput!) {
    publishPost(input: $input) {
      post {
        id
        title
        slug
        url
      }
    }
  }
`;

async function checkHashnodeDuplicate(slug) {
  const token = process.env.HASHNODE_TOKEN;
  const pubId = process.env.HASHNODE_PUB_ID;
  if (!token || !pubId) return false;
  try {
    const response = await fetch(HASHNODE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        query: `query { publication(id: "${pubId}") { post(slug: "${slug}") { id } } }`,
      }),
    });
    if (!response.ok) return false;
    const json = await response.json();
    return !!json?.data?.publication?.post?.id;
  } catch {
    return false;
  }
}

// Note: Hashnode's publishPost mutation always publishes immediately.
// There is no draft mode via this API. The --publish flag is ignored.
async function postToHashnode(slug, { dryRun }) {
  console.log('  Note: Hashnode publishes immediately (no draft mode via API).');
  const { meta, content } = loadPost(slug);
  const canonicalUrl = `${SITE_URL}/writing/${slug}/`;

  // Check for duplicates
  if (!dryRun) {
    const exists = await checkHashnodeDuplicate(slug);
    if (exists) {
      console.log(`  Skipping: already exists on Hashnode (slug: ${slug})`);
      return;
    }
  }
  const tags = formatHashnodeTags(meta.tags);
  const coverImageUrl = meta.cover ? `${SITE_URL}${meta.cover}` : undefined;

  const input = {
    title: meta.title,
    subtitle: meta.subtitle || undefined,
    contentMarkdown: content,
    originalArticleURL: canonicalUrl,
    slug,
    tags,
  };

  if (coverImageUrl) {
    input.coverImageOptions = { coverImageURL: coverImageUrl };
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would post to Hashnode:`);
    console.log(`  Title:         ${input.title}`);
    console.log(`  Subtitle:      ${input.subtitle || '(none)'}`);
    console.log(`  Slug:          ${slug}`);
    console.log(`  Tags:          ${tags.map(t => t.name).join(', ')}`);
    console.log(`  Canonical URL: ${canonicalUrl}`);
    console.log(`  Cover image:   ${coverImageUrl || '(none)'}`);
    console.log(`  Body length:   ${content.length} chars`);
    return;
  }

  const token = process.env.HASHNODE_TOKEN;
  const pubId = process.env.HASHNODE_PUB_ID;

  if (!token) {
    console.error('Missing HASHNODE_TOKEN environment variable.');
    process.exit(1);
  }
  if (!pubId) {
    console.error('Missing HASHNODE_PUB_ID environment variable.');
    process.exit(1);
  }

  input.publicationId = pubId;

  const response = await fetch(HASHNODE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify({
      query: PUBLISH_POST_MUTATION,
      variables: { input },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Hashnode API error (${response.status}): ${text}`);
    process.exit(1);
  }

  const json = await response.json();

  if (json.errors) {
    console.error(`Hashnode GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
    process.exit(1);
  }

  const post = json?.data?.publishPost?.post;
  if (!post) {
    console.error('Unexpected response shape:', JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.log(`Posted to Hashnode: ${post.url}`);
  return post;
}

// ── CLI ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const positional = args.filter(a => !a.startsWith('--'));

  const dryRun = flags.has('--dry-run');
  const all = flags.has('--all');

  if (!all && positional.length === 0) {
    console.error('Usage: node scripts/cross-post-hashnode.mjs <slug> [--dry-run]');
    console.error('       node scripts/cross-post-hashnode.mjs --all [--dry-run]');
    process.exit(1);
  }

  const slugs = all ? listAllSlugs() : [positional[0]];

  for (const slug of slugs) {
    console.log(`\nProcessing: ${slug}`);
    await postToHashnode(slug, { dryRun });
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

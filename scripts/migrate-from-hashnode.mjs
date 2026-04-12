import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const HASHNODE_API = 'https://gql.hashnode.com';
const HOST = 'blog.jcosta.tech';

const POSTS_DIR = join(ROOT, 'posts');
const COVERS_DIR = join(ROOT, 'assets', 'covers');
const POST_IMAGES_DIR = join(ROOT, 'assets', 'post-images');

const query = `
  query GetAllPosts($host: String!) {
    publication(host: $host) {
      posts(first: 50) {
        edges {
          node {
            title
            subtitle
            slug
            publishedAt
            readTimeInMinutes
            url
            coverImage { url }
            content { markdown }
            tags { name slug }
            seo { title description }
          }
        }
      }
    }
  }
`;

async function fetchAllPosts() {
  const response = await fetch(HASHNODE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { host: HOST } }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const edges = json?.data?.publication?.posts?.edges;
  if (!edges) {
    throw new Error('Unexpected response shape: missing publication.posts.edges');
  }

  return edges.map(({ node }) => ({
    title: node.title,
    subtitle: node.subtitle ?? '',
    slug: node.slug,
    date: node.publishedAt.slice(0, 10),
    readTime: node.readTimeInMinutes,
    url: node.url,
    coverImage: node.coverImage?.url ?? '',
    markdown: node.content?.markdown ?? '',
    tags: (node.tags ?? []).map((t) => t.name),
    seoTitle: node.seo?.title ?? '',
    seoDescription: node.seo?.description ?? '',
  }));
}

async function downloadImage(url, destPath) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  Warning: failed to download ${url} (${response.status})`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(destPath, buffer);
    return destPath;
  } catch (err) {
    console.warn(`  Warning: failed to download ${url}: ${err.message}`);
    return null;
  }
}

function getImageExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = extname(pathname);
    if (ext && ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext.toLowerCase())) {
      return ext.toLowerCase();
    }
  } catch {
    // fall through
  }
  return '.png';
}

async function downloadAndRewriteInlineImages(markdown, slug) {
  // Hashnode uses non-standard syntax: ![alt](url align="center")
  // Match both standard and Hashnode-style image references
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+align="[^"]*")?\)/g;
  const matches = [...markdown.matchAll(imageRegex)];

  if (matches.length === 0) return markdown;

  const slugImageDir = join(POST_IMAGES_DIR, slug);
  mkdirSync(slugImageDir, { recursive: true });

  let updated = markdown;
  let imageIndex = 0;

  for (const match of matches) {
    const [fullMatch, altText, imageUrl] = match;
    const ext = getImageExtension(imageUrl);
    const filename = `${imageIndex}${ext}`;
    const destPath = join(slugImageDir, filename);
    const localPath = `/assets/post-images/${slug}/${filename}`;

    const result = await downloadImage(imageUrl, destPath);
    if (result) {
      updated = updated.replace(fullMatch, `![${altText}](${localPath})`);
      imageIndex++;
    }
  }

  return updated;
}

function buildFrontmatter(post, coverPath) {
  const lines = ['---'];
  lines.push(`title: ${JSON.stringify(post.title)}`);
  if (post.subtitle) lines.push(`subtitle: ${JSON.stringify(post.subtitle)}`);
  lines.push(`date: ${post.date}`);
  lines.push(`readTime: ${post.readTime}`);
  if (coverPath) lines.push(`cover: ${JSON.stringify(coverPath)}`);
  if (post.tags.length > 0) lines.push(`tags: [${post.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
  if (post.seoTitle) lines.push(`seoTitle: ${JSON.stringify(post.seoTitle)}`);
  if (post.seoDescription) lines.push(`seoDescription: ${JSON.stringify(post.seoDescription)}`);
  lines.push(`hashnodeUrl: ${JSON.stringify(post.url)}`);
  lines.push('---');
  return lines.join('\n');
}

async function migratePost(post) {
  console.log(`Migrating: ${post.title}`);

  // Download cover image
  let coverPath = '';
  if (post.coverImage) {
    const ext = getImageExtension(post.coverImage);
    const coverFilename = `${post.slug}${ext}`;
    const coverDest = join(COVERS_DIR, coverFilename);
    const result = await downloadImage(post.coverImage, coverDest);
    if (result) {
      coverPath = `/assets/covers/${coverFilename}`;
    }
  }

  // Download and rewrite inline images
  const updatedMarkdown = await downloadAndRewriteInlineImages(post.markdown, post.slug);

  // Build the markdown file
  const frontmatter = buildFrontmatter(post, coverPath);
  const fileContent = `${frontmatter}\n\n${updatedMarkdown}\n`;

  const postPath = join(POSTS_DIR, `${post.slug}.md`);
  writeFileSync(postPath, fileContent, 'utf8');
  console.log(`  -> ${postPath}`);

  return { slug: post.slug, coverPath };
}

async function main() {
  console.log(`Fetching all posts from ${HOST}...\n`);
  const posts = await fetchAllPosts();
  console.log(`Found ${posts.length} posts.\n`);

  // Create directories
  mkdirSync(POSTS_DIR, { recursive: true });
  mkdirSync(COVERS_DIR, { recursive: true });
  mkdirSync(POST_IMAGES_DIR, { recursive: true });

  // Migrate each post
  const results = [];
  for (const post of posts) {
    const result = await migratePost(post);
    results.push(result);
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log(`Migration complete: ${results.length} posts exported.`);
  console.log(`  Posts:        ${POSTS_DIR}`);
  console.log(`  Cover images: ${COVERS_DIR}`);
  console.log(`  Post images:  ${POST_IMAGES_DIR}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the exported markdown files in posts/');
  console.log('  2. Verify images downloaded correctly in assets/');
  console.log('  3. Build a post renderer to generate HTML pages');
  console.log('  4. Update embed-data.mjs to read from local posts');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

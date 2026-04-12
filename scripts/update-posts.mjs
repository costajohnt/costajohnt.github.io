import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'posts');

function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') {
    throw new Error('Missing opening frontmatter delimiter');
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error('Missing closing frontmatter delimiter');
  }

  const frontmatter = {};
  for (let i = 1; i < endIndex; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Parse arrays (e.g. tags: ["tag1", "tag2"])
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => {
          s = s.trim();
          if (
            (s.startsWith('"') && s.endsWith('"')) ||
            (s.startsWith("'") && s.endsWith("'"))
          ) {
            s = s.slice(1, -1);
          }
          return s;
        })
        .filter((s) => s.length > 0);
    }

    frontmatter[key] = value;
  }

  return frontmatter;
}

function readPosts() {
  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  return files.map((file) => {
    const content = readFileSync(join(POSTS_DIR, file), 'utf8');
    const fm = parseFrontmatter(content);
    const slug = basename(file, '.md');

    return {
      title: fm.title || '',
      subtitle: fm.subtitle || '',
      date: String(fm.date || ''),
      readTime: `${fm.readTime || 0} min`,
      url: `/writing/${slug}/`,
      coverImage: fm.cover || '',
    };
  });
}

function main() {
  const posts = readPosts();
  posts.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  const outputPath = join(ROOT, 'data', 'posts.json');
  writeFileSync(outputPath, JSON.stringify({ posts }, null, 2) + '\n');
  console.log(`Wrote ${posts.length} posts to ${outputPath}`);
}

try {
  main();
} catch (err) {
  console.error('Failed to update posts:', err);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * publish-post.mjs
 *
 * One-command publish workflow: builds the site, pushes to GitHub,
 * and cross-posts to Substack.
 *
 * Usage:
 *   node scripts/publish-post.mjs <slug>                  # build + push + Substack draft
 *   node scripts/publish-post.mjs <slug> --publish        # build + push + Substack publish
 *   node scripts/publish-post.mjs <slug> --cross-post-all # also post to Dev.to & Hashnode
 *   node scripts/publish-post.mjs <slug> --skip-push      # build only, no git push
 *   node scripts/publish-post.mjs <slug> --skip-substack  # build + push, no Substack
 *
 * Environment variables:
 *   SUBSTACK_COOKIE  - Required for Substack cross-posting
 */

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, renameSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load .env file if it exists
const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    // Strip surrounding quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function run(cmd, args, label) {
  console.log(`\n  ${label}...`);
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error(`  Failed: ${label}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith('--'));
  const slug = args.find((a) => !a.startsWith('--'));

  if (!slug) {
    console.error('Usage: node scripts/publish-post.mjs <slug> [--publish] [--skip-push] [--skip-substack]');
    process.exit(1);
  }

  const postPath = join(ROOT, 'posts', `${slug}.md`);
  if (!existsSync(postPath)) {
    console.error(`Post not found: ${postPath}`);
    process.exit(1);
  }

  const skipPush = flags.includes('--skip-push');
  const skipSubstack = flags.includes('--skip-substack');
  const substackPublish = flags.includes('--publish');

  console.log(`\nPublishing: ${slug}`);
  console.log(`  Push to GitHub: ${skipPush ? 'no' : 'yes'}`);
  console.log(`  Cross-post to Substack: ${skipSubstack ? 'no' : 'yes'}`);

  // Step 1: Build
  console.log('\n── Building site ──');

  if (!run('node', ['scripts/build-posts.mjs'], 'Building post HTML pages')) {
    process.exit(1);
  }

  if (!run('node', ['scripts/generate-feed.mjs'], 'Generating RSS feed')) {
    process.exit(1);
  }

  if (!run('node', ['scripts/embed-data.mjs'], 'Updating homepage and writing page')) {
    process.exit(1);
  }

  // Step 2: Push to GitHub
  if (!skipPush) {
    console.log('\n── Pushing to GitHub ──');

    run('git', ['add', 'posts/', 'writing/', 'data/', 'feed.xml', 'index.html', 'writing.html', 'sitemap.xml', 'contributions.html', 'assets/'], 'Staging files');

    const commitMsg = `Publish: ${slug}`;
    const hasChanges = (() => {
      try {
        execFileSync('git', ['diff', '--staged', '--quiet'], { cwd: ROOT });
        return false;
      } catch {
        return true;
      }
    })();

    if (hasChanges) {
      run('git', ['commit', '-m', commitMsg], 'Committing');
      run('git', ['push'], 'Pushing to GitHub');
      console.log('  Site will be live on jcosta.tech shortly.');
    } else {
      console.log('  No changes to commit.');
    }
  }

  // Step 3: Cross-post to Substack
  if (!skipSubstack) {
    console.log('\n── Cross-posting to Substack ──');

    if (!process.env.SUBSTACK_COOKIE) {
      console.log('  Skipping: SUBSTACK_COOKIE not set.');
    } else {
      const venvPython = join(ROOT, '.venv', 'bin', 'python');
      const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';
      const script = join(ROOT, 'scripts', 'cross-post-substack.py');

      if (existsSync(script)) {
        const substackArgs = [script, slug, '--publish'];
        run(pythonCmd, substackArgs, 'Publishing to Substack');
      } else {
        console.log('  Skipping: cross-post-substack.py not found.');
      }
    }
  }

  // Step 4: Cross-post to Hashnode
  if (!flags.includes('--skip-hashnode')) {
    console.log('\n── Cross-posting to Hashnode ──');

    if (!process.env.HASHNODE_TOKEN || !process.env.HASHNODE_PUB_ID) {
      console.log('  Skipping: HASHNODE_TOKEN or HASHNODE_PUB_ID not set.');
    } else {
      const hashnodeScript = join(ROOT, 'scripts', 'cross-post-hashnode.mjs');
      if (existsSync(hashnodeScript)) {
        run('node', [hashnodeScript, slug], 'Publishing to Hashnode');
      }
    }
  }

  // Step 5: Cross-post to Dev.to (optional)
  if (flags.includes('--cross-post-all') || flags.includes('--devto')) {
    console.log('\n── Cross-posting to Dev.to ──');

    if (!process.env.DEVTO_API_KEY) {
      console.log('  Skipping: DEVTO_API_KEY not set.');
    } else {
      const devtoScript = join(ROOT, 'scripts', 'cross-post-devto.mjs');
      if (existsSync(devtoScript)) {
        run('node', [devtoScript, slug, '--publish'], 'Publishing to Dev.to');
      }
    }
  }

  // Step 6: Move draft to published in Obsidian vault
  const vaultDrafts = join(homedir(), 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents', 'notes', 'blog-posts', 'drafts');
  const vaultPublished = join(homedir(), 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents', 'notes', 'blog-posts', 'published', slug);

  if (existsSync(vaultDrafts)) {
    console.log('\n── Organizing vault ──');

    mkdirSync(vaultPublished, { recursive: true });

    // Copy canonical post
    copyFileSync(postPath, join(vaultPublished, 'post.md'));

    // Copy cover image if it exists
    const coverPath = join(ROOT, 'assets', 'covers', `${slug}.png`);
    const coverPathJpg = join(ROOT, 'assets', 'covers', `${slug}.jpeg`);
    if (existsSync(coverPath)) {
      copyFileSync(coverPath, join(vaultPublished, `${slug}.png`));
    } else if (existsSync(coverPathJpg)) {
      copyFileSync(coverPathJpg, join(vaultPublished, `${slug}.jpeg`));
    }

    // Move any matching drafts
    try {
      const drafts = readdirSync(vaultDrafts);
      for (const file of drafts) {
        if (file.toLowerCase().includes(slug.replace(/-/g, '').substring(0, 15)) || file.toLowerCase().includes(slug.substring(0, 20))) {
          renameSync(join(vaultDrafts, file), join(vaultPublished, file));
          console.log(`  Moved draft: ${file}`);
        }
      }
    } catch {
      // Draft matching is best-effort
    }

    console.log(`  Organized in: blog-posts/published/${slug}/`);
  }

  console.log('\n── Done ──\n');
}

main();

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
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
        const substackArgs = [script, slug];
        if (substackPublish) substackArgs.push('--publish');
        run(pythonCmd, substackArgs, 'Creating Substack draft');
      } else {
        console.log('  Skipping: cross-post-substack.py not found.');
      }
    }
  }

  // Step 4: Cross-post to Dev.to and Hashnode (optional)
  if (flags.includes('--cross-post-all')) {
    console.log('\n── Cross-posting to Dev.to & Hashnode ──');
    const crossPostScript = join(ROOT, 'scripts', 'cross-post.mjs');
    const crossPostArgs = [crossPostScript, slug, '--all-platforms'];
    if (substackPublish) crossPostArgs.push('--publish');
    run('node', crossPostArgs, 'Cross-posting to all platforms');
  }

  console.log('\n── Done ──\n');
}

main();

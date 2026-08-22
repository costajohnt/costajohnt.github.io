#!/usr/bin/env node
/**
 * publish-post.mjs
 *
 * One-command publish workflow: builds the site, pushes to GitHub,
 * and cross-posts to Substack.
 *
 * Usage:
 *   node scripts/publish-post.mjs <slug>                     # build + push + Substack draft
 *   node scripts/publish-post.mjs <slug> --publish           # build + push + Substack publish
 *   node scripts/publish-post.mjs <slug> --cross-post-all    # also post to Dev.to
 *   node scripts/publish-post.mjs <slug> --skip-push         # build only, no git push
 *   node scripts/publish-post.mjs <slug> --skip-substack     # build + push, no Substack
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
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
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
  console.log(`  Cross-post to Substack: ${skipSubstack ? 'no' : substackPublish ? 'publish' : 'draft'}`);

  // Non-fatal step failures collected here; reported at the end with exit 1
  // so a partially failed publish never looks like a clean run.
  const failures = [];

  // Step 0: Pre-sync with remote to reduce diverged-remote race at push time.
  // Hashnode auto-syncs a `create post:` commit back to main during the cross-post
  // step, and the daily OSS-stats workflow can also push between local builds. Pulling
  // first means our regenerated feed.xml/sitemap.xml are based on the latest remote state.
  if (!skipPush) {
    console.log('\n── Syncing with remote ──');
    if (!run('git', ['pull', '--rebase'], 'Pulling latest from origin')) {
      console.error('  Pre-sync failed. Resolve any local changes and re-run.');
      process.exit(1);
    }
  }

  // Step 1: Build
  console.log('\n── Building site ──');

  // Covers: regenerate webp variants so a new cover can never ship unoptimized
  // (writing.html/index.html would otherwise lazy-load the full-size PNG).
  const hasMagick = (() => {
    try {
      execFileSync('magick', ['-version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })();
  if (hasMagick) {
    if (!run('node', ['scripts/optimize-covers.mjs'], 'Optimizing cover images')) process.exit(1);
  }
  const hasCoverSource = ['png', 'jpeg', 'jpg'].some((ext) =>
    existsSync(join(ROOT, 'assets', 'covers', `${slug}.${ext}`)));
  if (hasCoverSource) {
    const coverMeta = (() => {
      try {
        return JSON.parse(readFileSync(join(ROOT, 'data', 'cover-meta.json'), 'utf8'));
      } catch {
        return {};
      }
    })();
    if (!coverMeta[slug]) {
      console.error(`\n  Cover for "${slug}" has no entry in data/cover-meta.json, so the site`);
      console.error('  would serve the full-size original as a thumbnail. Install ImageMagick');
      console.error('  (`brew install imagemagick`) and re-run, or run `node scripts/optimize-covers.mjs`.');
      process.exit(1);
    }
  }

  if (!run('node', ['scripts/build-posts.mjs'], 'Building post HTML pages')) {
    process.exit(1);
  }

  if (!run('node', ['scripts/generate-feed.mjs'], 'Generating RSS feed')) {
    process.exit(1);
  }

  if (!run('node', ['scripts/embed-data.mjs'], 'Updating homepage and writing page')) {
    process.exit(1);
  }

  // Gate the publish on the test suite so a bad build never reaches main
  // (CI only runs on pull requests; this script pushes directly).
  if (!run('npm', ['test'], 'Running tests')) {
    process.exit(1);
  }

  // Step 2: Push to GitHub
  if (!skipPush) {
    console.log('\n── Pushing to GitHub ──');

    if (!run('git', ['add', 'posts/', 'writing/', 'data/', 'feed.xml', 'llms.txt', 'index.html', 'writing.html', 'sitemap.xml', 'contributions.html', 'about.html', 'contact.html', 'testimonials.html', '404.html', 'assets/'], 'Staging files')) {
      console.error('  Staging failed. Aborting before commit.');
      process.exit(1);
    }

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
      if (!run('git', ['commit', '-m', commitMsg], 'Committing')) {
        console.error('  Commit failed. Aborting: pushing old HEAD would leave cross-posts pointing at an undeployed page.');
        process.exit(1);
      }
      let pushed = run('git', ['push'], 'Pushing to GitHub');
      if (!pushed) {
        // Push rejected — usually because Hashnode auto-synced a commit during the
        // build/cross-post window, or the OSS-stats workflow ran. Pull with rebase,
        // taking our changes for any conflicts in generated files, then regenerate
        // to make sure feed.xml/sitemap.xml reflect the merged state.
        console.log('\n  Push rejected. Pulling latest with rebase (taking our changes on conflicts)...');
        if (!run('git', ['pull', '--rebase', '-X', 'theirs'], 'Pulling and rebasing')) {
          console.error('  Rebase failed. Resolve manually then `git push`.');
          process.exit(1);
        }
        if (!run('node', ['scripts/generate-feed.mjs'], 'Regenerating feed post-rebase')) process.exit(1);
        if (!run('node', ['scripts/embed-data.mjs'], 'Re-embedding data post-rebase')) process.exit(1);
        const hasDrift = (() => {
          try {
            execFileSync('git', ['diff', '--quiet'], { cwd: ROOT });
            return false;
          } catch {
            return true;
          }
        })();
        if (hasDrift) {
          if (!run('git', ['add', 'feed.xml', 'llms.txt', 'sitemap.xml', 'index.html', 'writing.html', 'contributions.html', 'about.html', 'contact.html', 'testimonials.html', '404.html', 'data/'], 'Staging post-rebase regen')) process.exit(1);
          if (!run('git', ['commit', '-m', `${commitMsg} (post-rebase regen)`], 'Committing regen')) process.exit(1);
        }
        pushed = run('git', ['push'], 'Retry push');
        if (!pushed) {
          console.error('  Retry push failed. Resolve manually.');
          process.exit(1);
        }
      }
      console.log('  Site will be live on jcosta.tech shortly.');
    } else {
      console.log('  No changes to commit.');
    }
  }

  // Step 3: Cross-post to Substack (draft by default, --publish to go live)
  if (!skipSubstack) {
    console.log('\n── Cross-posting to Substack ──');

    if (!process.env.SUBSTACK_COOKIE) {
      console.log('  Skipping: SUBSTACK_COOKIE not set.');
    } else {
      const venvPython = join(ROOT, '.venv', 'bin', 'python');
      const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';
      const script = join(ROOT, 'scripts', 'cross-post-substack.py');

      if (existsSync(script)) {
        const substackArgs = substackPublish ? [script, slug, '--publish'] : [script, slug];
        const label = substackPublish ? 'Publishing to Substack' : 'Creating Substack draft';
        if (!run(pythonCmd, substackArgs, label)) failures.push('Substack cross-post');
      } else {
        console.log('  Skipping: cross-post-substack.py not found.');
      }
    }
  }

  // Step 4: Hashnode cross-post was removed 2026-05-14: Hashnode shut down
  // their free GraphQL API on 2026-05-13 and moved it to a paid case-by-case
  // offering. The cross-post-hashnode.mjs script was deleted in #28; recover
  // it from git history if Hashnode ever gets a usable API again.

  // Step 5: Cross-post to Dev.to (optional)
  if (flags.includes('--cross-post-all') || flags.includes('--devto')) {
    console.log('\n── Cross-posting to Dev.to ──');

    if (!process.env.DEVTO_API_KEY) {
      console.log('  Skipping: DEVTO_API_KEY not set.');
    } else {
      const devtoScript = join(ROOT, 'scripts', 'cross-post-devto.mjs');
      if (existsSync(devtoScript)) {
        if (!run('node', [devtoScript, slug, '--publish'], 'Publishing to Dev.to')) failures.push('Dev.to cross-post');
      }
    }
  }

  // Step 6: Move draft to published in Obsidian vault.
  // The vault base differs per machine (the Air keeps it at ~/Documents/notes,
  // iCloud-synced; claude-mbp uses ~/dev/notes). Honor an explicit VAULT_DIR
  // override first, then fall back to the known locations — whichever actually
  // has a blog-posts/ dir wins. Without this the step silently no-ops off-Air.
  const vaultRoot = [
    process.env.VAULT_DIR,
    join(homedir(), 'Documents', 'notes'),
    join(homedir(), 'dev', 'notes'),
  ].filter(Boolean).find((d) => existsSync(join(d, 'blog-posts')));

  if (vaultRoot) {
    console.log('\n── Organizing vault ──');
    try {
      const vaultDrafts = join(vaultRoot, 'blog-posts', 'drafts');
      const vaultPublished = join(vaultRoot, 'blog-posts', 'published', slug);

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

      // Move any matching drafts (best-effort, but say so when it fails).
      // Compare with separators stripped from BOTH sides; the old code
      // stripped dashes only from the slug, so that clause never matched.
      const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const needle = normalize(slug).substring(0, 20);
      try {
        const drafts = readdirSync(vaultDrafts);
        for (const file of drafts) {
          // Minimum needle length so a hypothetical short slug can't
          // sweep up every draft in the folder.
          if (needle.length >= 6 && normalize(file).includes(needle)) {
            renameSync(join(vaultDrafts, file), join(vaultPublished, file));
            console.log(`  Moved draft: ${file}`);
          }
        }
      } catch (err) {
        console.error(`  Warning: draft organizing skipped: ${err.message}`);
      }

      console.log(`  Organized in: blog-posts/published/${slug}/`);
    } catch (err) {
      console.error(`  Vault organization failed: ${err.message}`);
      failures.push('Vault organization');
    }
  } else {
    console.log('\n── Organizing vault ──');
    console.log('  Skipping: no vault with blog-posts/ found (set VAULT_DIR to override).');
  }

  if (failures.length) {
    console.error(`\n── Done, with failures: ${failures.join(', ')} ──`);
    console.error('  Fix the failed step and re-run. Git steps are idempotent and Substack');
    console.error('  deduplicates by title. Dev.to and Hashnode do NOT reliably deduplicate;');
    console.error('  check those dashboards before re-running with their flags.\n');
    process.exit(1);
  }
  console.log('\n── Done ──\n');
}

main();

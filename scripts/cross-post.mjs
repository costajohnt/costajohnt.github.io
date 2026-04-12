/**
 * cross-post.mjs
 *
 * Unified entry point for cross-posting to Dev.to and Hashnode.
 *
 * Usage:
 *   node scripts/cross-post.mjs claude-code-tips-and-tricks
 *   node scripts/cross-post.mjs claude-code-tips-and-tricks --devto --hashnode
 *   node scripts/cross-post.mjs claude-code-tips-and-tricks --all-platforms
 *   node scripts/cross-post.mjs --all --all-platforms --dry-run
 *   node scripts/cross-post.mjs claude-code-tips-and-tricks --devto --publish
 *
 * When no platform flag is given, posts to all platforms that have their
 * API keys configured in the environment.
 *
 * Environment:
 *   DEVTO_API_KEY   — Dev.to API key (enables Dev.to posting)
 *   HASHNODE_TOKEN  — Hashnode personal access token (enables Hashnode posting)
 *   HASHNODE_PUB_ID — Hashnode publication ID (required with HASHNODE_TOKEN)
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Helpers ─────────────────────────────────────────────────────────

function run(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = execFile('node', [scriptPath, ...args], {
      env: process.env,
      cwd: join(__dirname, '..'),
    }, (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (err) {
        reject(new Error(`Script exited with code ${err.code}`));
      } else {
        resolve();
      }
    });
  });
}

// ── Platform config ─────────────────────────────────────────────────

const PLATFORMS = {
  devto: {
    script: join(__dirname, 'cross-post-devto.mjs'),
    envRequired: ['DEVTO_API_KEY'],
    label: 'Dev.to',
  },
  hashnode: {
    script: join(__dirname, 'cross-post-hashnode.mjs'),
    envRequired: ['HASHNODE_TOKEN', 'HASHNODE_PUB_ID'],
    label: 'Hashnode',
  },
};

function isConfigured(platform) {
  return platform.envRequired.every(key => process.env[key]);
}

// ── CLI ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const positional = args.filter(a => !a.startsWith('--'));

  const dryRun = flags.has('--dry-run');
  const allPosts = flags.has('--all');
  const publish = flags.has('--publish');
  const allPlatforms = flags.has('--all-platforms');

  // Determine which platforms to target
  const explicitPlatforms = Object.keys(PLATFORMS).filter(p => flags.has(`--${p}`));
  let targetPlatforms;

  if (allPlatforms || explicitPlatforms.length === 0) {
    // Post to all configured platforms
    targetPlatforms = Object.keys(PLATFORMS).filter(name => isConfigured(PLATFORMS[name]));

    if (!dryRun && targetPlatforms.length === 0) {
      console.error('No platforms configured. Set environment variables for at least one:');
      for (const [name, platform] of Object.entries(PLATFORMS)) {
        console.error(`  ${platform.label}: ${platform.envRequired.join(', ')}`);
      }
      process.exit(1);
    }

    // In dry-run mode, show all platforms even if not configured
    if (dryRun && targetPlatforms.length === 0) {
      targetPlatforms = Object.keys(PLATFORMS);
    }
  } else {
    targetPlatforms = explicitPlatforms;
  }

  if (!allPosts && positional.length === 0) {
    console.error('Usage: node scripts/cross-post.mjs <slug> [options]');
    console.error('       node scripts/cross-post.mjs --all [options]');
    console.error('');
    console.error('Platform flags:');
    console.error('  --devto       Post to Dev.to');
    console.error('  --hashnode    Post to Hashnode');
    console.error('  --all-platforms  Post to all configured platforms (default)');
    console.error('');
    console.error('Other flags:');
    console.error('  --all         Process all posts');
    console.error('  --publish     Publish immediately (Dev.to only; default is draft)');
    console.error('  --dry-run     Preview without posting');
    process.exit(1);
  }

  // Build args to forward to each platform script
  const forwardArgs = [];
  if (allPosts) {
    forwardArgs.push('--all');
  } else {
    forwardArgs.push(positional[0]);
  }
  if (dryRun) forwardArgs.push('--dry-run');
  if (publish) forwardArgs.push('--publish');

  console.log(`Platforms: ${targetPlatforms.map(p => PLATFORMS[p].label).join(', ')}`);
  console.log(`Posts:     ${allPosts ? 'all' : positional[0]}`);
  console.log(`Mode:      ${dryRun ? 'dry run' : publish ? 'publish' : 'draft'}`);

  let failures = 0;

  for (const name of targetPlatforms) {
    const platform = PLATFORMS[name];
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Cross-posting to ${platform.label}`);
    console.log('='.repeat(50));

    try {
      await run(platform.script, forwardArgs);
    } catch (err) {
      console.error(`\nFailed to post to ${platform.label}: ${err.message}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} platform(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll done.');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

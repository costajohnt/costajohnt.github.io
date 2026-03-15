import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIN_STARS = 50;

function getRepo(url) {
  return url.replace('https://github.com/', '').split('/').slice(0, 2).join('/');
}

function formatStars(count) {
  if (count >= 1000) {
    const k = count / 1000;
    return Number.isInteger(k) ? `${k}k` : `${(Math.round(k * 10) / 10).toFixed(1)}k`;
  }
  return String(count);
}

function main() {
  const statePath = join(process.env.HOME, '.oss-autopilot', 'state.json');
  if (!existsSync(statePath)) {
    console.error(`oss-autopilot state file not found at ${statePath}.`);
    console.error('Install and configure oss-autopilot first, or use update-oss-stats.mjs for incremental updates.');
    process.exit(1);
  }
  const state = JSON.parse(readFileSync(statePath, 'utf8'));

  const repoScores = state.repoScores ?? {};
  const mergedPRs = state.mergedPRs ?? [];

  // Filter to PRs in repos with 50+ stars, enrich with metadata
  const enriched = [];
  for (const pr of mergedPRs) {
    const repo = getRepo(pr.url);
    const score = repoScores[repo];
    if (!score || !(score.stargazersCount >= MIN_STARS)) continue;

    const prNumber = pr.url.split('/').pop();
    enriched.push({
      url: pr.url,
      title: pr.title,
      mergedAt: pr.mergedAt,
      repo,
      number: Number(prNumber),
      stars: score.stargazersCount,
      language: score.language ?? '',
    });
  }

  // Sort by mergedAt descending (newest first)
  enriched.sort((a, b) => new Date(b.mergedAt) - new Date(a.mergedAt));

  const outputPath = join(__dirname, '..', 'data', 'merged-prs.json');
  writeFileSync(outputPath, JSON.stringify({ prs: enriched }, null, 2) + '\n');
  console.log(`Seeded ${enriched.length} merged PRs to ${outputPath}`);
}

try {
  main();
} catch (err) {
  console.error('Failed to seed merged PRs:', err);
  process.exit(1);
}

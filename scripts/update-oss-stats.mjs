import { readFileSync, writeFileSync, existsSync, renameSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_REPOS } from './lib/projects.mjs';
import { deriveOssStats } from './lib/oss-stats.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.warn('Warning: GITHUB_TOKEN not set. Running with unauthenticated rate limits (60 req/hr).');
}
const USERNAME = 'costajohnt';
const MIN_STARS = 50;
const MIN_DATE = '2025-01-01';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubFetch(url) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

  // Secondary rate limits surface as 403/429 mid-pagination, and CI sees
  // transient network rejections; retry both with backoff (honoring
  // Retry-After) instead of failing the whole run.
  const maxAttempts = 4;
  for (let attempt = 1; ; attempt++) {
    let response;
    try {
      response = await fetch(url, { headers });
    } catch (err) {
      if (attempt < maxAttempts) {
        const waitMs = Math.min(60_000, 2 ** attempt * 2000);
        console.warn(`Network error (${err.message}) on attempt ${attempt}/${maxAttempts}; retrying in ${waitMs}ms...`);
        await delay(waitMs);
        continue;
      }
      throw err;
    }

    if (!response.ok) {
      const retryable = response.status === 403 || response.status === 429 || response.status >= 500;
      if (retryable && attempt < maxAttempts) {
        const retryAfter = Number(response.headers.get('Retry-After') ?? 0);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 2 ** attempt * 2000);
        console.warn(`GitHub API ${response.status} (attempt ${attempt}/${maxAttempts}); retrying in ${waitMs}ms...`);
        await delay(waitMs);
        continue;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} — ${url}`);
    }

    const remaining = Number(response.headers.get('X-RateLimit-Remaining') ?? Infinity);
    if (remaining < 10) {
      const resetAt = Number(response.headers.get('X-RateLimit-Reset') ?? 0);
      const waitMs = Math.max(0, resetAt * 1000 - Date.now()) + 1000;
      console.warn(`Rate limit low (${remaining} remaining). Waiting ${waitMs}ms...`);
      await delay(waitMs);
    }

    return response.json();
  }
}

// Write JSON via tmp-file + rename so a crash mid-write never leaves a
// truncated data file behind. PID suffix keeps concurrent runs (local +
// CI) from clobbering each other's tmp; cleanup on throw keeps stray tmp
// files out of the data/ dir, which gets staged wholesale.
function writeJsonAtomic(path, value) {
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}

// Fetch merged PRs since a given ISO date string
async function fetchMergedPRsSince(since) {
  const allItems = [];
  let page = 1;
  const perPage = 100;
  const sinceDate = since.split('T')[0]; // YYYY-MM-DD
  const query = `is:pr+is:merged+author:${USERNAME}+-user:${USERNAME}+merged:>${sinceDate}`;

  while (true) {
    const url = `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=${perPage}&page=${page}`;
    const data = await githubFetch(url);
    const items = data.items ?? [];
    allItems.push(...items);

    if (data.incomplete_results) {
      console.warn(`Warning: search page ${page} returned incomplete_results; the 30-day lookback on the next run will recover anything missed.`);
    }

    if (items.length < perPage || allItems.length >= 1000) break;
    page += 1;
    await delay(500);
  }

  return allItems;
}

async function getRepoMeta(repoFullName) {
  const url = `https://api.github.com/repos/${repoFullName}`;
  const data = await githubFetch(url);
  return {
    stars: data.stargazers_count ?? 0,
    language: data.language ?? '',
  };
}

function getRepo(url) {
  return url.replace('https://github.com/', '').split('/').slice(0, 2).join('/');
}

// Refresh star counts for the repos actually displayed (the top-scored ones),
// so chips don't freeze at the value cached when their last PR merged.
async function refreshDisplayedRepoStars(allPRs, limit = 8) {
  const repoMap = new Map();
  for (const pr of allPRs) {
    const entry = repoMap.get(pr.repo) ?? { count: 0, stars: pr.stars };
    entry.count += 1;
    if (pr.stars > entry.stars) entry.stars = pr.stars;
    repoMap.set(pr.repo, entry);
  }
  const topRepos = Array.from(repoMap.entries())
    .sort((a, b) => b[1].stars * Math.sqrt(b[1].count || 1) - a[1].stars * Math.sqrt(a[1].count || 1))
    .slice(0, limit)
    .map(([repo]) => repo);

  for (const repo of topRepos) {
    try {
      const meta = await getRepoMeta(repo);
      for (const pr of allPRs) {
        if (pr.repo === repo) {
          pr.stars = meta.stars;
          pr.language = pr.language || meta.language;
        }
      }
    } catch (err) {
      console.warn(`Could not refresh stars for ${repo}: ${err.message}`);
    }
    await delay(200);
  }
}

async function main() {
  const prsPath = join(ROOT, 'data', 'merged-prs.json');

  if (!existsSync(prsPath)) {
    console.error('data/merged-prs.json not found. Run seed-merged-prs.mjs first.');
    process.exit(1);
  }

  const existing = JSON.parse(readFileSync(prsPath, 'utf8'));
  const existingPRs = existing.prs ?? [];
  const existingUrls = new Set(existingPRs.map((p) => p.url));

  // Always look back 30 days from the latest PR to catch any GitHub search API stragglers.
  // The search API can miss PRs near date boundaries, so a rolling window ensures completeness.
  const latestMerged = existingPRs.length > 0 ? existingPRs[0].mergedAt : '2020-01-01T00:00:00Z';
  const lookbackDate = new Date(new Date(latestMerged).getTime() - 30 * 24 * 60 * 60 * 1000);
  const latestDate = lookbackDate.toISOString();
  console.log(`Fetching merged PRs since ${latestDate.split('T')[0]} (30-day lookback from ${latestMerged.split('T')[0]})...`);

  const newItems = await fetchMergedPRsSince(latestDate);
  console.log(`Found ${newItems.length} PRs from GitHub since ${latestDate.split('T')[0]}`);

  // Deduplicate against existing list
  const toAdd = newItems.filter((item) => !existingUrls.has(item.html_url));
  console.log(`${toAdd.length} new PRs to process`);

  // Cache repo metadata to avoid duplicate fetches
  const repoMetaCache = new Map();
  for (const pr of existingPRs) {
    if (!repoMetaCache.has(pr.repo)) {
      repoMetaCache.set(pr.repo, { stars: pr.stars, language: pr.language });
    }
  }

  // Enrich new PRs
  const enriched = [];
  for (const item of toAdd) {
    const repo = item.repository_url.replace('https://api.github.com/repos/', '');

    if (!repoMetaCache.has(repo)) {
      try {
        const meta = await getRepoMeta(repo);
        repoMetaCache.set(repo, meta);
      } catch (err) {
        console.warn(`Could not fetch metadata for ${repo}:`, err);
        repoMetaCache.set(repo, { stars: 0, language: '' });
      }
      await delay(200);
    }

    const meta = repoMetaCache.get(repo);
    if (meta.stars < MIN_STARS) continue;

    // Skip items with no merge/close date at all: they'd dodge the MIN_DATE
    // filter and get stamped with the run's current timestamp.
    const mergedAt = item.pull_request?.merged_at ?? item.closed_at ?? '';
    if (!mergedAt || mergedAt.slice(0, 10) < MIN_DATE) continue;

    const prNumber = item.html_url.split('/').pop();
    enriched.push({
      url: item.html_url,
      title: item.title,
      mergedAt,
      repo,
      number: Number(prNumber),
      stars: meta.stars,
      language: meta.language,
    });
  }

  if (enriched.length > 0) {
    console.log(`Adding ${enriched.length} new PRs to the list`);
  } else {
    console.log('No new PRs to add');
  }

  // Merge and sort by date descending
  const allPRs = [...existingPRs, ...enriched]
    .sort((a, b) => new Date(b.mergedAt) - new Date(a.mergedAt));

  // Keep displayed star counts current (bounded: top repos only)
  await refreshDisplayedRepoStars(allPRs);

  // Write updated merged-prs.json
  writeJsonAtomic(prsPath, { prs: allPRs });
  console.log(`Wrote ${allPRs.length} total PRs to ${prsPath}`);

  // Derive oss-stats.json from merged-prs.json. (mergeRate was removed: it
  // cost an extra API call, mixed a star-filtered numerator with an
  // unfiltered denominator, and nothing rendered it.)
  const ossStats = deriveOssStats(allPRs);

  const ossPath = join(ROOT, 'data', 'oss-stats.json');
  writeJsonAtomic(ossPath, ossStats);
  console.log(`Wrote OSS stats to ${ossPath}`);

  // Live metadata for the homepage project cards
  const projects = {};
  for (const repo of PROJECT_REPOS) {
    try {
      const data = await githubFetch(`https://api.github.com/repos/${repo}`);
      projects[repo] = {
        stars: data.stargazers_count ?? 0,
        pushedAt: (data.pushed_at ?? '').slice(0, 10),
      };
    } catch (err) {
      console.warn(`Could not fetch project meta for ${repo}: ${err.message}`);
    }
    await delay(200);
  }
  if (Object.keys(projects).length > 0) {
    const projectsPath = join(ROOT, 'data', 'projects.json');
    writeJsonAtomic(projectsPath, { projects });
    console.log(`Wrote project meta to ${projectsPath}`);
  } else {
    console.warn('No project meta fetched; keeping existing data/projects.json');
  }
}

main().catch((err) => {
  console.error('Failed to update OSS stats:', err);
  process.exit(1);
});

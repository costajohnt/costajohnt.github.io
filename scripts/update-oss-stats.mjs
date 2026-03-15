import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

  const response = await fetch(url, { headers });
  if (!response.ok) {
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

function formatStars(count) {
  if (count >= 1000) {
    const k = count / 1000;
    return Number.isInteger(k) ? `${k}k` : `${(Math.round(k * 10) / 10).toFixed(1)}k`;
  }
  return String(count);
}

function getRepo(url) {
  return url.replace('https://github.com/', '').split('/').slice(0, 2).join('/');
}

function deriveOssStats(prs) {
  // Group by repo
  const repoMap = new Map();
  const languages = new Set();

  for (const pr of prs) {
    const entry = repoMap.get(pr.repo) ?? { count: 0, stars: pr.stars, language: pr.language, url: `https://github.com/${pr.repo}` };
    entry.count += 1;
    // Use latest star count
    if (pr.stars > entry.stars) entry.stars = pr.stars;
    repoMap.set(pr.repo, entry);
    if (pr.language) languages.add(pr.language);
  }

  // Sort repos by composite score: stars * sqrt(prCount)
  const sortedRepos = Array.from(repoMap.entries())
    .sort((a, b) => {
      const scoreA = a[1].stars * Math.sqrt(a[1].count || 1);
      const scoreB = b[1].stars * Math.sqrt(b[1].count || 1);
      return scoreB - scoreA;
    });

  const mapContribution = ([repo, data]) => {
    const displayName = data.stars >= 5000 ? repo : repo.split('/')[1];
    const entry = { repo: displayName, url: data.url, stars: formatStars(data.stars) };
    if (data.count >= 2) entry.prs = data.count;
    return entry;
  };

  const allContributions = sortedRepos.map(mapContribution);
  const contributions = allContributions.slice(0, 8);

  return {
    stats: {
      prsMerged: prs.length,
      repos: `${repoMap.size}+`,
      mergeRate: '', // Will be filled below
      languages: languages.size,
    },
    contributions,
    allContributions,
  };
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

  // Find the most recent mergedAt date
  const latestDate = existingPRs.length > 0 ? existingPRs[0].mergedAt : '2020-01-01T00:00:00Z';
  console.log(`Fetching merged PRs since ${latestDate}...`);

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

    const mergedAt = item.pull_request?.merged_at ?? item.closed_at ?? '';
    if (mergedAt && mergedAt.slice(0, 10) < MIN_DATE) continue;

    const prNumber = item.html_url.split('/').pop();
    enriched.push({
      url: item.html_url,
      title: item.title,
      mergedAt: item.pull_request?.merged_at ?? item.closed_at ?? new Date().toISOString(),
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

  // Write updated merged-prs.json
  writeFileSync(prsPath, JSON.stringify({ prs: allPRs }, null, 2) + '\n');
  console.log(`Wrote ${allPRs.length} total PRs to ${prsPath}`);

  // Derive oss-stats.json from merged-prs.json
  const ossStats = deriveOssStats(allPRs);

  // Fetch total PR count for merge rate (single cheap API call)
  const totalQuery = `is:pr+author:${USERNAME}+-user:${USERNAME}`;
  const totalUrl = `https://api.github.com/search/issues?q=${totalQuery}&per_page=1&page=1`;
  const totalData = await githubFetch(totalUrl);
  const totalPRs = totalData.total_count ?? 0;
  ossStats.stats.mergeRate = totalPRs > 0
    ? `${Math.round((allPRs.length / totalPRs) * 100)}%`
    : '0%';

  const ossPath = join(ROOT, 'data', 'oss-stats.json');
  writeFileSync(ossPath, JSON.stringify(ossStats, null, 2) + '\n');
  console.log(`Wrote OSS stats to ${ossPath}`);
}

main().catch((err) => {
  console.error('Failed to update OSS stats:', err);
  process.exit(1);
});

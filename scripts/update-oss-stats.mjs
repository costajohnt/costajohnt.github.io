import { readFileSync, writeFileSync, existsSync, renameSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_REPOS } from './lib/projects.mjs';
import { deriveOssStats, qualifyingPRs, MIN_STARS } from './lib/oss-stats.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = 'costajohnt';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubFetch(url, init = {}) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

  // Secondary rate limits surface as 403/429 mid-pagination, and CI sees
  // transient network rejections; retry both with backoff (honoring
  // Retry-After) instead of failing the whole run.
  const maxAttempts = 4;
  for (let attempt = 1; ; attempt++) {
    let response;
    try {
      response = await fetch(url, { ...init, headers });
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

// One search over all time, stars and language inline: the single writer for
// the merged-PR count. jcosta.tech serves the result at /data/oss-stats.json
// and the GitHub profile README reads it from there, so both show one number.
// ponytail: search caps at 1000 results; split by merged: date ranges past that.
const SEARCH_QUERY = `query($q: String!, $after: String) {
  search(type: ISSUE, query: $q, first: 100, after: $after) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        url title number mergedAt
        repository { nameWithOwner stargazerCount primaryLanguage { name } }
      }
    }
  }
}`;

async function fetchAllMergedPRs() {
  const q = `is:pr is:merged author:${USERNAME} -user:${USERNAME}`;
  const nodes = [];
  let after = null;
  let issueCount = 0;
  do {
    const res = await githubFetch('https://api.github.com/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: SEARCH_QUERY, variables: { q, after } }),
    });
    if (res.errors?.length) throw new Error(`GraphQL error: ${res.errors.map((e) => e.message).join('; ')}`);
    const { search } = res.data;
    issueCount = search.issueCount;
    nodes.push(...search.nodes.filter((n) => n?.url));
    after = search.pageInfo.hasNextPage ? search.pageInfo.endCursor : null;
    if (after) await delay(500);
  } while (after);

  // A short read would publish a lower count; fail and keep yesterday's data.
  if (nodes.length < Math.min(issueCount, 1000)) {
    throw new Error(`Search returned ${nodes.length} of ${issueCount} PRs; refusing to publish a partial count.`);
  }
  return nodes;
}

async function main() {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required (GraphQL search needs auth).');
  const prsPath = join(ROOT, 'data', 'merged-prs.json');
  const ossPath = join(ROOT, 'data', 'oss-stats.json');

  const allPRs = qualifyingPRs(await fetchAllMergedPRs());
  console.log(`${allPRs.length} merged PRs to ${MIN_STARS}+ star repos (all time)`);

  // Truncated search or a bad token can return far fewer rows without an
  // error. A real drop is a repo or two falling under the cutoff, never 10%.
  const previous = existsSync(ossPath) ? JSON.parse(readFileSync(ossPath, 'utf8')).stats?.prsMerged ?? 0 : 0;
  if (allPRs.length < previous * 0.9 && !process.env.FORCE) {
    throw new Error(`Count fell from ${previous} to ${allPRs.length}; refusing to publish. Run with FORCE=1 if real.`);
  }

  writeJsonAtomic(prsPath, { prs: allPRs });
  const ossStats = { rule: { minStars: MIN_STARS, excludeOwnRepos: true, since: 'all-time' }, ...deriveOssStats(allPRs) };
  writeJsonAtomic(ossPath, ossStats);
  console.log(`Wrote ${prsPath} and ${ossPath}`);

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

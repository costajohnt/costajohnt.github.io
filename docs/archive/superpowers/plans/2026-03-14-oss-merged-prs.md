# OSS Merged PRs: Seed, Incremental Cron, and Website Display

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the expensive full-fetch OSS stats script with an incremental approach seeded from oss-autopilot's state.json, and display merged PRs on the portfolio site with a dedicated /contributions page.

**Architecture:** A one-time seed script reads `~/.oss-autopilot/state.json` to create `data/merged-prs.json` (the running list of PRs to 50+ star repos, enriched with repo metadata). The daily cron job reads this list, queries GitHub only for PRs merged after the most recent entry, enriches new ones with star/language data, filters to 50+ stars, and appends them. Both `oss-stats.json` (repo chips, aggregate stats) and the recently-merged section are derived from this single source of truth. A new `contributions.html` page displays the full list.

**Tech Stack:** Node.js (ESM), GitHub REST API, vanilla HTML/CSS/JS, GitHub Actions

---

## File Structure

| File | Role |
|------|------|
| `scripts/seed-merged-prs.mjs` | **NEW.** One-time script that reads `~/.oss-autopilot/state.json`, filters to 50+ star repos, enriches with metadata, writes `data/merged-prs.json`. Run locally, not in CI. |
| `scripts/update-oss-stats.mjs` | **REWRITE.** Incremental cron script. Reads `data/merged-prs.json`, finds latest `mergedAt`, queries GitHub Search API for new merged PRs since that date, fetches star/language for any new repos, filters to 50+ stars, appends to the list, then derives `data/oss-stats.json` from the full list. |
| `data/merged-prs.json` | **NEW.** Running list of all merged PRs to 50+ star repos. Source of truth. Checked into git. |
| `data/oss-stats.json` | **EXISTS.** Derived from `merged-prs.json` by the update script. Contains aggregate stats and repo chip data for `embed-data.mjs`. |
| `scripts/embed-data.mjs` | **MODIFY.** Add a new function to generate the "Recently merged" HTML section from `merged-prs.json`, plus generate `contributions.html` from a template. |
| `index.html` | **MODIFY.** Add `<!-- BEGIN:RECENT_PRS -->` / `<!-- END:RECENT_PRS -->` markers in the Open Source section for the recently-merged list. |
| `contributions.html` | **NEW.** Full-page list of all merged PRs, styled like the portfolio. |
| `styles.css` | **MODIFY.** Add styles for the recent-PR list items and the contributions page. |
| `.github/workflows/update-oss-stats.yml` | **MODIFY.** Update the commit step to also add `data/merged-prs.json` and `contributions.html`. |

---

## Chunk 1: Seed Script and Data Layer

### Task 1: Create the seed script

**Files:**
- Create: `scripts/seed-merged-prs.mjs`

This script is run locally once to bootstrap the data. It is not used in CI.

- [ ] **Step 1: Write `scripts/seed-merged-prs.mjs`**

```javascript
import { readFileSync, writeFileSync } from 'fs';
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
  const state = JSON.parse(readFileSync(statePath, 'utf8'));

  const repoScores = state.repoScores ?? {};
  const mergedPRs = state.mergedPRs ?? [];

  // Filter to PRs in repos with 50+ stars, enrich with metadata
  const enriched = [];
  for (const pr of mergedPRs) {
    const repo = getRepo(pr.url);
    const score = repoScores[repo];
    if (!score || score.stargazersCount < MIN_STARS) continue;

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

main();
```

- [ ] **Step 2: Run the seed script**

Run: `node scripts/seed-merged-prs.mjs`
Expected: `Seeded 57 merged PRs to .../data/merged-prs.json`

- [ ] **Step 3: Verify the output**

Run: `cat data/merged-prs.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['prs']), 'PRs'); print(json.dumps(d['prs'][0], indent=2))"`
Expected: 57 PRs, first entry should be the most recent PR with all fields (url, title, mergedAt, repo, number, stars, language).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-merged-prs.mjs data/merged-prs.json
git commit -m "feat: seed merged PRs list from oss-autopilot state"
```

---

### Task 2: Rewrite the incremental update script

**Files:**
- Rewrite: `scripts/update-oss-stats.mjs`

The new script does two things:
1. Incrementally fetches new merged PRs since the latest entry in `data/merged-prs.json`.
2. Derives `data/oss-stats.json` (aggregate stats + repo chips) from the full merged-prs list.

- [ ] **Step 1: Rewrite `scripts/update-oss-stats.mjs`**

```javascript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = 'costajohnt';
const MIN_STARS = 50;

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

  // Sort repos by stars descending
  const sortedRepos = Array.from(repoMap.entries())
    .sort((a, b) => b[1].stars - a[1].stars);

  const contributions = sortedRepos.map(([repo, data]) => {
    const displayName = data.stars >= 5000 ? repo : repo.split('/')[1];
    const entry = { repo: displayName, url: data.url, stars: formatStars(data.stars) };
    if (data.count >= 2) entry.prs = data.count;
    return entry;
  });

  return {
    stats: {
      prsMerged: prs.length,
      repos: `${repoMap.size}+`,
      mergeRate: '', // Will be filled below
      languages: languages.size,
    },
    contributions,
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
        console.warn(`Could not fetch metadata for ${repo}: ${err.message}`);
        repoMetaCache.set(repo, { stars: 0, language: '' });
      }
      await delay(200);
    }

    const meta = repoMetaCache.get(repo);
    if (meta.stars < MIN_STARS) continue;

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
  process.exit(0);
});
```

- [ ] **Step 2: Run the update script (should find 0 new PRs since we just seeded)**

Run: `GITHUB_TOKEN=$(gh auth token) node scripts/update-oss-stats.mjs`
Expected output should include:
- `Fetching merged PRs since 2026-03-13T...`
- `0 new PRs to process` (or a small number if any merged since seed)
- `Wrote 57 total PRs to .../data/merged-prs.json`
- `Wrote OSS stats to .../data/oss-stats.json`

- [ ] **Step 3: Verify `data/oss-stats.json` looks correct**

Check that `prsMerged` is 57, repos count matches, and contributions list has the right repos sorted by stars.

- [ ] **Step 4: Commit**

```bash
git add scripts/update-oss-stats.mjs data/oss-stats.json
git commit -m "feat: rewrite OSS stats to use incremental merged-prs list"
```

---

### Task 3: Update GitHub Actions workflow

**Files:**
- Modify: `.github/workflows/update-oss-stats.yml`

- [ ] **Step 1: Update the workflow to commit `merged-prs.json` and `contributions.html`**

In the "Commit and push if changed" step, change the `git add` line:

```yaml
          git add data/merged-prs.json data/oss-stats.json index.html contributions.html
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/update-oss-stats.yml
git commit -m "chore: update workflow to track merged-prs.json and contributions.html"
```

---

## Chunk 2: Website Display

### Task 4: Add "Recently merged" section to index.html

**Files:**
- Modify: `index.html` (add markers between the repo chips and "My Projects")
- Modify: `styles.css` (add styles for recent-PR items)

The recently-merged section goes in the Open Source section, after the repo chips and before "My Projects." It shows the 5 most recent PRs in a compact list, similar to the writing section style but with repo name and PR number instead of read time.

- [ ] **Step 1: Add HTML markers to `index.html`**

Insert between the `</div> <!-- .contrib-repos -->` closing tag (after line 184) and the `<!-- My Projects -->` comment (line 186):

```html

      <!-- Recently merged PRs -->
      <div class="recent-prs">
        <p class="contrib-repos-label">Recently merged</p>
        <div class="recent-prs-list">
          <!-- BEGIN:RECENT_PRS -->
          <!-- END:RECENT_PRS -->
        </div>
        <div class="recent-prs-cta">
          <a href="contributions.html" class="btn btn-ghost">See all contributions &rarr;</a>
        </div>
      </div>
```

- [ ] **Step 2: Add CSS styles to `styles.css`**

Add after the `.repo-chip .pr-count` block (after line 455):

```css
/* ── Recent PRs ── */
.recent-prs { margin-top: 2.5rem; margin-bottom: 2.5rem; }

.recent-prs-list { display: flex; flex-direction: column; }

.recent-pr-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: baseline;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.recent-pr-item:first-child { border-top: 1px solid var(--border); }

.recent-pr-item:hover {
  padding-left: 0.75rem;
  background: linear-gradient(90deg, var(--accent-soft) 0%, transparent 40%);
}

.recent-pr-item h4 {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.recent-pr-repo {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  margin-top: 0.15rem;
}

.recent-pr-date {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.recent-prs-cta {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}
```

Add mobile responsive rule inside the `@media (max-width: 860px)` block:

```css
  .recent-pr-item { grid-template-columns: 1fr; gap: 0.25rem; }
  .recent-pr-date { order: -1; }
```

- [ ] **Step 3: Commit**

```bash
git add index.html styles.css
git commit -m "feat: add recently merged PRs section with markers"
```

---

### Task 5: Update embed-data.mjs to generate recent PRs HTML

**Files:**
- Modify: `scripts/embed-data.mjs`

- [ ] **Step 1: Add `generateRecentPRsHTML` function and update `main()`**

Add the function after `generatePostsHTML`:

```javascript
function generateRecentPRsHTML(prs) {
  return prs
    .slice(0, 5)
    .map((pr) => {
      const date = formatDate(pr.mergedAt.slice(0, 10));
      const shortRepo = pr.repo.split('/')[1];
      return [
        `          <a href="${pr.url}" class="recent-pr-item">`,
        `            <div>`,
        `              <h4>${pr.title}</h4>`,
        `              <p class="recent-pr-repo">${pr.repo}#${pr.number}</p>`,
        `            </div>`,
        `            <span class="recent-pr-date">${date}</span>`,
        `          </a>`,
      ].join('\n');
    })
    .join('\n');
}
```

In `main()`, add reading of `merged-prs.json` and the marker replacement:

```javascript
  const mergedPRsData = JSON.parse(
    readFileSync(join(ROOT, 'data', 'merged-prs.json'), 'utf8')
  );

  html = replaceBetweenMarkers(
    html,
    '<!-- BEGIN:RECENT_PRS -->',
    '<!-- END:RECENT_PRS -->',
    generateRecentPRsHTML(mergedPRsData.prs)
  );
```

- [ ] **Step 2: Run embed script and verify**

Run: `node scripts/embed-data.mjs`
Expected: `index.html updated successfully.` and the recent PRs section is populated between markers.

- [ ] **Step 3: Commit**

```bash
git add scripts/embed-data.mjs index.html
git commit -m "feat: embed recently merged PRs into index.html"
```

---

### Task 6: Create the contributions page

**Files:**
- Create: `contributions.html`
- Modify: `scripts/embed-data.mjs` (add generation of contributions.html)

The contributions page shows all merged PRs in a full-page list. It follows the same visual style as the portfolio (same fonts, colors, nav, footer). Each row shows the PR title (linked), repo name with star count, language, and merge date.

- [ ] **Step 1: Create `contributions.html` template**

Create the file with the same head/nav/footer structure as `testimonials.html`, but with the contributions-specific content. Include `<!-- BEGIN:ALL_PRS -->` / `<!-- END:ALL_PRS -->` markers for the embed script to populate.

The page should contain:
- Same nav as index.html
- A header: eyebrow "OPEN SOURCE", heading "Contributions", and a short intro line
- A summary stats bar (total PRs, repos, languages) pulled from oss-stats.json
- The full PR list with columns: PR title + repo, stars, language, date merged
- Same footer as index.html
- Page-specific styles in an inline `<style>` tag (following the testimonials.html pattern)

Key CSS for the list:
```css
.pr-list-item {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 1.5rem;
  align-items: baseline;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}
```

Mobile responsive: collapse to single column.

- [ ] **Step 2: Add generation logic to `embed-data.mjs`**

Add a `generateAllPRsHTML` function that renders all PRs (not just 5) with the full column layout (title, stars, language, date). Update `main()` to read `contributions.html`, replace the `ALL_PRS` markers, and write it back.

```javascript
function generateAllPRsHTML(prs) {
  return prs
    .map((pr) => {
      const date = formatDate(pr.mergedAt.slice(0, 10));
      const starsDisplay = formatStarsForDisplay(pr.stars);
      return [
        `        <a href="${pr.url}" class="pr-list-item">`,
        `          <div>`,
        `            <h4>${pr.title}</h4>`,
        `            <p class="pr-list-repo">${pr.repo}#${pr.number}</p>`,
        `          </div>`,
        `          <span class="pr-list-stars">&#9733; ${starsDisplay}</span>`,
        `          <span class="pr-list-lang">${pr.language}</span>`,
        `          <span class="pr-list-date">${date}</span>`,
        `        </a>`,
      ].join('\n');
    })
    .join('\n');
}
```

Also add a `formatStarsForDisplay` helper that converts raw star counts (e.g., 35553) to display strings (e.g., "35.6k").

- [ ] **Step 3: Run embed script and verify**

Run: `node scripts/embed-data.mjs`
Expected: Both `index.html` and `contributions.html` updated. Open `contributions.html` in browser to verify the list renders with all 57 PRs.

- [ ] **Step 4: Commit**

```bash
git add contributions.html scripts/embed-data.mjs
git commit -m "feat: add contributions page with full merged PR list"
```

---

### Task 7: Browser verification

- [ ] **Step 1: Verify index.html in browser**

Open index.html. In the Open Source section, verify:
- Repo chips display with correct star counts and PR badges
- "Recently merged" section shows the 5 most recent PRs
- Each PR row shows title, repo#number, and date
- "See all contributions" button is visible and links to contributions.html
- Hover effects work on PR items

- [ ] **Step 2: Verify contributions.html in browser**

Open contributions.html. Verify:
- Nav and footer match index.html
- Stats bar shows correct totals (57 PRs, 21+ repos, etc.)
- All 57 PRs are listed with title, stars, language, and date
- Each PR links to the correct GitHub PR URL
- Mobile responsive: resize browser to verify single-column layout

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: polish contributions display"
```

# Auto-Updating Data Pipeline

This portfolio site automatically refreshes its OSS contribution stats and blog posts. There are no manual data entry steps for either section.

## Overview

```
Hashnode (blog) ──webhook──> Cloudflare Worker ──dispatch──> GitHub Actions
                                                                  │
GitHub (schedule) ─────────────────────────────────────────> GitHub Actions
                                                                  │
                                                          ┌───────┴───────┐
                                                          │  Fetch data   │
                                                          │  from APIs    │
                                                          └───────┬───────┘
                                                                  │
                                                    ┌─────────────┼─────────────┐
                                                    ▼             ▼             ▼
                                              merged-prs.json  oss-stats.json  posts.json
                                                    │             │             │
                                                    └─────────────┼─────────────┘
                                                                  │
                                                          ┌───────┴───────┐
                                                          │  embed-data   │
                                                          │  into HTML    │
                                                          └───────┬───────┘
                                                                  │
                                                    ┌─────────────┼──────────┐
                                                    ▼             ▼          ▼
                                              index.html  contributions.html
                                                          (auto-committed)
```

## Data Files

All data lives in `data/`:

| File | Source | Updated by |
|------|--------|-----------|
| `merged-prs.json` | GitHub Search API | `update-oss-stats.mjs` |
| `oss-stats.json` | Derived from merged-prs.json | `update-oss-stats.mjs` |
| `posts.json` | Hashnode GraphQL API | `update-posts.mjs` |

## Scripts

### `scripts/update-oss-stats.mjs`

Incrementally fetches merged PRs from GitHub and derives OSS statistics.

**How it works:**
1. Reads existing `data/merged-prs.json` to find the latest PR date
2. Fetches all merged PRs since that date via GitHub Search API
3. Deduplicates against existing PRs
4. Enriches new PRs with repo metadata (stars, language)
5. Filters out repos with fewer than 50 stars and PRs before 2025-01-01
6. Derives `oss-stats.json` from the full PR list, ranking repos by `stars * sqrt(prCount)` and taking the top 8

**Environment:** Requires `GITHUB_TOKEN` for authenticated API access.

### `scripts/update-posts.mjs`

Fetches the 20 most recent blog posts from Hashnode.

**How it works:**
1. Queries the Hashnode GraphQL API for posts on `blog.jcosta.tech`
2. Extracts title, subtitle, date, read time, URL, and cover image
3. Writes to `data/posts.json`

### `scripts/embed-data.mjs`

Injects JSON data into HTML files using marker comments.

**How it works:**
1. Reads all three JSON data files
2. Generates HTML fragments for each section
3. Replaces content between `<!-- BEGIN:X -->` and `<!-- END:X -->` markers in `index.html` and `contributions.html`
4. All user-controlled strings are escaped with `escapeHtml()` to prevent XSS

**Markers in `index.html`:**
- `OSS_STATS` - PR count, repo count, language count
- `OSS_REPOS` - Top 8 repo chips with stars and PR counts
- `RECENT_PRS` - 5 most recent merged PRs
- `POSTS` - Blog post list with thumbnails

**Markers in `contributions.html`:**
- `CONTRIB_STATS` - Same stats, different format
- `ALL_PRS` - Complete list of all merged PRs

### `scripts/seed-merged-prs.mjs`

One-time script that seeds `merged-prs.json` from local oss-autopilot state. Only needed for initial setup.

## GitHub Actions Workflows

### `.github/workflows/update-oss-stats.yml`

- **Schedule:** Daily at 7:00 AM UTC
- **Trigger:** Manual via workflow_dispatch
- **Steps:** Runs `update-oss-stats.mjs`, then `embed-data.mjs`, auto-commits changes

### `.github/workflows/update-posts.yml`

- **Schedule:** Daily at 6:00 AM UTC
- **Triggers:** Manual, or `repository_dispatch` from Hashnode webhook
- **Steps:** Runs `update-posts.mjs`, then `embed-data.mjs`, auto-commits changes

## Hashnode Webhook (Real-time Blog Updates)

A Cloudflare Worker at `workers/hashnode-webhook.js` provides near-instant blog updates:

1. Hashnode sends a POST with `x-hashnode-signature` header when a post is published
2. Worker verifies the HMAC-SHA256 signature (timing-safe via `crypto.subtle.verify`)
3. On success, dispatches a `hashnode-post-published` event to GitHub
4. GitHub Actions picks up the `repository_dispatch` and runs the posts workflow

**Cloudflare secrets required:**
- `HASHNODE_WEBHOOK_SECRET` - Shared secret from Hashnode webhook settings
- `GITHUB_PAT` - Fine-grained PAT with `contents:write` on this repo

**Deploy:** `npx wrangler deploy workers/hashnode-webhook.js --name hashnode-webhook`

## Local Development

Run the full pipeline locally:

```bash
# Fetch and embed everything
GITHUB_TOKEN=$(gh auth token) node scripts/update-oss-stats.mjs
node scripts/update-posts.mjs
node scripts/embed-data.mjs
```

Or just re-embed existing data (no API calls):

```bash
node scripts/embed-data.mjs
```

## Adding New Auto-Updated Sections

1. Add a data-fetching script in `scripts/`
2. Add a `generate*HTML()` function in `embed-data.mjs`
3. Add `<!-- BEGIN:SECTION_NAME -->` / `<!-- END:SECTION_NAME -->` markers in the HTML
4. Call `replaceBetweenMarkers()` in `main()` of `embed-data.mjs`
5. Add the data file to the relevant workflow's `git add` step

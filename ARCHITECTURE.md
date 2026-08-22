# Site Architecture

Static portfolio and blog (vanilla HTML/CSS/JS, GitHub Pages). Generated content is injected between HTML marker comments; OSS stats and blog pages rebuild daily via GitHub Actions. No manual data entry.

## Overview

```
posts/*.md ──> build-posts.mjs ──> writing/{slug}/index.html (+ index.md)
                    │                writing/tags/{slug}/index.html
                    └──> data/posts.json, data/tags.json

GitHub API ──> update-oss-stats.mjs ──> data/merged-prs.json
                                        data/oss-stats.json
                                        data/projects.json

posts + data ──> generate-feed.mjs ──> feed.xml, sitemap.xml, llms.txt

data + partials/ ──> embed-data.mjs ──> markers in index.html,
                                        contributions.html, writing.html,
                                        and nav/footer/head chrome in
                                        every static page
```

The daily `build-site.yml` workflow runs those four scripts in that order, tests the result, and commits it.

## Data Files

All data lives in `data/`:

| File | Source | Written by |
|------|--------|-----------|
| `merged-prs.json` | GitHub Search API | `update-oss-stats.mjs` |
| `oss-stats.json` | Derived from merged-prs.json | `update-oss-stats.mjs` |
| `projects.json` | GitHub repo API (live meta for homepage project cards) | `update-oss-stats.mjs` |
| `posts.json` | Frontmatter of visible posts in `posts/` | `build-posts.mjs` |
| `tags.json` | Tag frequencies across visible posts | `build-posts.mjs` |
| `cover-meta.json` | WebP variant dimensions | `optimize-covers.mjs` |

## Marker Inventory

`embed-data.mjs` replaces content between `<!-- BEGIN:X -->` / `<!-- END:X -->` pairs. Missing markers throw.

**index.html**
- `HERO_CARD` - headline stats + 6-month sparkline (SVG from `lib/sparkline.mjs`)
- `OSS_STATS` - PR count, repo count, language count
- `OSS_REPOS` - top 8 repo chips (stars, PR counts)
- `RECENT_PRS` - 5 most recent merged PRs
- `POSTS` - post list (shared renderer in `lib/post-list.mjs`)
- `PROJ:<owner/repo>` - one per repo in `lib/projects.mjs` `PROJECT_REPOS`; live stars/pushed date from `projects.json` (tolerates a missing file)

**contributions.html**
- `CONTRIB_STATS` - same stats, inline format
- `CONTRIB_CHART` - 18-month full-width sparkline
- `CONTRIB_FILTERS` - language filter chips, ordered by frequency
- `ALL_PRS` - every merged PR, grouped by month dividers

**writing.html**
- `ALL_POSTS` - full post list (same renderer as `POSTS`)
- `TAG_CLOUD` - top 12 tag pills from `tags.json`

**Every page in `CHROME_PAGES`** (see below)
- `HEAD_COMMON`, `HEAD_FONTS`, `NAV`, `FOOTER` - injected verbatim from `partials/{head-common,head-fonts,nav,footer}.html`. Blog post and tag pages get the same partials at build time from `build-posts.mjs` instead of via markers.

## CHROME_PAGES

`scripts/lib/pages.mjs` is the single source of truth for the hand-authored pages that carry injected chrome and belong in sitemap.xml: index, writing, contributions, about, testimonials, contact, 404 (sitemap excludes 404; list order is sitemap order). Two shell consumers cannot import it and carry hand-synced copies, each with a comment pointing back:

- `.githooks/pre-commit` (auto-stage list)
- `.github/workflows/build-site.yml` (git add list)

Editing `CHROME_PAGES` means updating both mirrors.

## Scripts

### `scripts/build-posts.mjs`

Converts `posts/*.md` into `writing/{slug}/index.html` pages using `marked` with a custom renderer (`lib/posts.mjs`: labeled code blocks, lazy images). Also:

- Copies each source `.md` to `writing/{slug}/index.md` (raw-markdown endpoint, linked from llms.txt)
- Computes up to 3 related posts by tag overlap (`computeRelatedPosts`)
- Builds tag landing pages at `writing/tags/{slug}/`; tags with fewer than 3 posts (`MIN_TAG_POSTS_FOR_INDEX`, same threshold in `generate-feed.mjs`) get `noindex` and stay out of the sitemap
- Writes `data/posts.json` (visible posts only) and `data/tags.json`
- **Prunes** `writing/` dirs whose source post was deleted or renamed, and tag dirs whose tag disappeared. Only dirs carrying the generator's fingerprint (the canonical `<link>` the template always emits) are deleted; anything else gets a loud warning and is left alone (`shouldPruneDir` in `lib/posts.mjs`).

**Drafts:** `draft: true` in frontmatter builds the page as a `noindex, nofollow` preview but keeps the post out of posts.json, tag pages, related posts, feed, sitemap, and llms.txt. A committed draft page is still publicly reachable by URL; the flag hides it, it does not make it private. Draft preview dirs survive the prune locally, but CI only sees committed files: commit the `.md` alongside a committed preview dir, or neither.

### `scripts/embed-data.mjs`

Reads the JSON data files, generates HTML fragments, and replaces marker content (inventory above) in index.html, contributions.html, and writing.html, then injects the shared chrome partials into every `CHROME_PAGES` page. All user-controlled strings pass through `escapeHtml()` (`lib/html.mjs`). `replaceBetweenMarkers` uses a replacer function so `$`-sequences in PR titles are inserted literally.

### `scripts/generate-feed.mjs`

Generates three files from visible posts (archived and draft posts excluded):

- `feed.xml` - RSS with cover enclosures (stats local cover files for real byte lengths)
- `sitemap.xml` - static pages from `CHROME_PAGES`, post pages, and tag pages with 3+ posts. `lastmod` is honest: post pages use `updated:` frontmatter (never allowed to regress below the publish date) or the publish date; listing pages use the newest item they show; other static pages carry none
- `llms.txt` - site summary plus every post with a link to its raw markdown

Writes are skipped when nothing but volatile fields changed (`writeIfChanged`, ignoring `<lastBuildDate>`), so unchanged daily rebuilds produce no git churn.

### `scripts/update-oss-stats.mjs`

Incrementally fetches merged PRs from GitHub and derives OSS statistics.

1. Reads existing `data/merged-prs.json`, fetches merged PRs since the latest entry with a 30-day lookback (the search API misses PRs near date boundaries)
2. Deduplicates by URL, enriches new PRs with repo metadata (stars, language)
3. Filters out repos under 50 stars and PRs merged before 2025-01-01
4. Refreshes live star counts for the displayed (top-scored) repos only
5. Derives `oss-stats.json` via `lib/oss-stats.mjs` (`deriveOssStats`): repos ranked by `stars * sqrt(prCount)`, top 8 displayed
6. Fetches live meta for `PROJECT_REPOS` into `projects.json`

Retries 403/429/5xx and network errors with backoff (honoring Retry-After); writes JSON atomically (tmp file + rename). Requires `GITHUB_TOKEN` for sane rate limits.

### `scripts/publish-post.mjs`

One-command publish: `node scripts/publish-post.mjs <slug>` (flags: `--publish`, `--cross-post-all`/`--devto`, `--skip-push`, `--skip-substack`). Loads `.env` if present. Steps:

1. Refuses posts marked `draft: true`
2. `git pull --rebase` (reduces diverged-remote races with the daily workflow)
3. Optimizes covers if ImageMagick is installed; fails if a cover has no `cover-meta.json` entry
4. Runs build-posts, generate-feed, embed-data, then **`npm test` as a publish gate** (this script pushes directly to main; CI never gates it)
5. Commits and pushes; on rejection, `pull --rebase -X theirs`, regenerates, re-tests, and retries once
6. Cross-posts to Substack (draft by default, `--publish` to go live) via the repo venv's Python and `cross-post-substack.py`; needs `SUBSTACK_COOKIE`
7. Optionally cross-posts to Dev.to (`cross-post-devto.mjs`, needs `DEVTO_API_KEY`)
8. Moves the matching draft to published in the Obsidian vault (`VAULT_DIR` override, then known per-machine locations)

Cross-post failures are collected and reported at the end with exit 1 rather than aborting the git steps. Hashnode cross-posting was removed 2026-05-14 when Hashnode shut down their free GraphQL API; recover `cross-post-hashnode.mjs` from git history if that ever changes.

### Cross-post scripts (Python + venv)

`cross-post-substack.py` posts one slug to Substack via `python-substack`, converting markdown to Substack's ProseMirror JSON with `md_to_prosemirror.py` (markdown-it-py token walk). It polls the live post URL first because GitHub Pages takes 30-90s to deploy and Substack fetches the cover from jcosta.tech. `cross-post-backlog.py` drips the whole backlog. Dependencies live in `scripts/requirements.txt`, pinned exactly because `python-substack` handles the session cookie (a compromised auto-upgraded release could exfiltrate it); install into `.venv/` at the repo root, which `publish-post.mjs` prefers over system `python3`.

**Two markdown parsers, accepted:** the Node side renders posts with `marked` (the only npm dependency); the Substack path parses the same markdown again with `markdown-it-py`. The ProseMirror conversion needs a token-stream AST and the Substack client is Python, so each runtime keeps its own parser rather than bridging runtimes. Rendering can theoretically diverge between the site and Substack; in practice the posts use a common subset.

### Other scripts

- `scripts/optimize-covers.mjs` - converts `assets/covers/*.{png,jpeg,jpg}` to WebP (720px cover + 112px thumb) and writes `cover-meta.json`. Needs ImageMagick locally; outputs are committed, CI never runs it
- `scripts/cross-post-devto.mjs` - Dev.to cross-post (single slug or `--all`, `--dry-run`)
- `scripts/seed-merged-prs.mjs` - one-time seeding of `merged-prs.json`; initial setup only

### `scripts/lib/` modules

| Module | Exports |
|--------|---------|
| `pages.mjs` | `CHROME_PAGES` (see above) |
| `html.mjs` | `escapeHtml` (text nodes + double-quoted attributes) |
| `xml.mjs` | `escapeXml`, `toRfc822` |
| `format.mjs` | `formatDate`, `formatISODate`, `formatStars`, `slugifyTag` |
| `frontmatter.mjs` | `parseFrontmatter` (the YAML subset posts use), `flagIsTrue` (warns on YAML-ish truthy spellings) |
| `covers.mjs` | `loadCoverMeta`, `webpCover`, `webpThumb` |
| `posts.mjs` | `createRenderer`, `compareDatesDesc`, `computeRelatedPosts`, `shouldPruneDir` |
| `post-list.mjs` | `renderWritingListHTML`, shared by index POSTS, writing ALL_POSTS, and tag pages |
| `oss-stats.mjs` | `deriveOssStats` |
| `sparkline.mjs` | `monthlyCounts`, `buildSparklineSVG` |
| `projects.mjs` | `PROJECT_REPOS` |

## Tests

`npm test` runs `scripts/embed-data.test.mjs` and `scripts/pipeline.test.mjs` (plain assert-based, no framework). They cover marker replacement, escaping, formatting, the sparkline, the prune guard, stat derivation, and end-to-end draft behavior (preview builds noindex; draft stays out of posts.json, tags, feed, sitemap, llms.txt). The Python converter has its own suite: `.venv/bin/python scripts/test_md_to_prosemirror.py`.

## Pre-commit Hook

`.githooks/pre-commit` (install: `git config core.hooksPath .githooks`):

- Rejects staged cover images that have no `cover-meta.json` entry
- Re-runs `build-posts.mjs` when `posts/`, `scripts/lib/`, `partials/`, or `build-posts.mjs` itself is staged; re-runs `embed-data.mjs` and `generate-feed.mjs` when those, the generators, or the data files are staged
- Auto-stages whatever the regeneration changed (page list mirrors `CHROME_PAGES` by hand)

## GitHub Actions Workflows

### `.github/workflows/build-site.yml`

- **Triggers:** daily at 6:00 AM UTC, manual `workflow_dispatch`, `repository_dispatch` type `oss-pr-merged`. Concurrency group prevents overlapping runs
- **Steps:** `build-posts.mjs`, `update-oss-stats.mjs` (with `GITHUB_TOKEN`), `generate-feed.mjs`, `embed-data.mjs`, then `npm test`, then commit an explicit file list if anything changed (`git pull --rebase` before push)
- **Tests run AFTER regeneration** deliberately: they validate `data/*.json` and the embedded HTML, which the build steps just rewrote. Running them first would only validate yesterday's committed data

### `.github/workflows/ci.yml`

- **Triggers:** every pull request, push to main, manual dispatch
- **Steps:** `node --check` on every `.mjs` (including `scripts/lib/`), `python3 -m py_compile` on the Python scripts, then `npm test`

Note: `publish-post.mjs` pushes directly to main, so its own `npm test` gate is what protects publishes; CI on main runs after the fact.

## Local Development

```bash
# Full pipeline
node scripts/build-posts.mjs
GITHUB_TOKEN=$(gh auth token) node scripts/update-oss-stats.mjs
node scripts/generate-feed.mjs
node scripts/embed-data.mjs

# Just re-embed existing data (no API calls)
node scripts/embed-data.mjs

# Publish a post end to end
node scripts/publish-post.mjs <slug>
```

## Adding New Auto-Updated Sections

1. Add a data-fetching script in `scripts/`
2. Add a `generate*HTML()` function in `embed-data.mjs`
3. Add `<!-- BEGIN:SECTION_NAME -->` / `<!-- END:SECTION_NAME -->` markers in the HTML
4. Call `replaceBetweenMarkers()` in `main()` of `embed-data.mjs`
5. Add the data file to `build-site.yml`'s `git add` list and, if the hook should regenerate on it, to `.githooks/pre-commit`

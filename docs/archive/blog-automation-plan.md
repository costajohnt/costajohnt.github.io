# Blog Automation Plan

> **Status: Completed (April 2026).** This is a historical planning document
> for the migration off Hashnode. Current architecture is described in
> `ARCHITECTURE.md`. Hashnode references below are kept for context.

## Context

Migrating from Hashnode to a self-hosted blog on jcosta.tech. Posts are markdown files with frontmatter stored in `posts/` in the costajohnt.github.io repo. Cover images and inline images are in `assets/covers/` and `assets/post-images/`.

This plan covers the automation layer: cross-publishing to Substack and the GitHub Actions workflow that ties everything together.

## Prerequisites (done in the redesign session)

- [x] Export all 14 posts from Hashnode as markdown with images
- [ ] Blog renderer script (`scripts/build-posts.mjs`) — converts markdown to HTML pages
- [ ] Update `embed-data.mjs` to read from local posts instead of Hashnode API
- [ ] Update homepage post links to local URLs
- [ ] Remove Hashnode webhook and `update-posts.mjs`

## Part 1: Substack Setup

### Account setup
1. Create a Substack publication (or connect existing one)
2. Configure it as a secondary distribution channel — canonical URLs point back to jcosta.tech
3. Import existing subscriber list from Hashnode newsletter if possible

### API access
- Substack doesn't have a public write API. Options:
  - **Option A: Substack API (unofficial/undocumented)** — risky, could break
  - **Option B: Email-to-publish** — Substack supports publishing via email. Send formatted HTML to a publish address. More stable but limited formatting control.
  - **Option C: Puppeteer/browser automation** — script that logs into Substack and creates a draft via the web editor. Most reliable for formatting but fragile to UI changes.
  - **Option D: RSS-to-Substack via Zapier/Make** — use an RSS feed from jcosta.tech to trigger Substack draft creation. Low maintenance but adds a third-party dependency.

### Research Results (2026-04-12)
- **Option A (unofficial API):** Can only create Notes (short-form), not full posts. Requires session cookie auth. Fragile.
- **Option B (email-to-publish):** Does not exist on Substack.
- **Option C (Puppeteer):** No maintained scripts exist. High maintenance for low-frequency publishing.
- **Option D (RSS + Zapier/Make):** Not viable — Zapier/Make have no Substack integration for post creation.
- **Canonical URLs:** Substack does not support them. SEO impact is minimal in 2026 if you publish on your own site first.

### Recommendation
**Manual cross-posting is the practical choice.** At 1-4 posts per month, the workflow is:
1. Publish on jcosta.tech first (canonical source, establishes search index priority)
2. Copy-paste into Substack's editor within a day
3. Add "Originally published at jcosta.tech" with a link
4. Publish to subscribers

The RSS feed is still valuable for SEO, podcast apps, and reader tools — just not for Substack automation.

## Part 2: RSS Feed Generation

Add to the build pipeline (`scripts/build-posts.mjs` or a new `scripts/generate-feed.mjs`):

```
Input: posts/*.md (frontmatter + content)
Output: feed.xml (Atom or RSS 2.0)
```

Each entry includes:
- Title, subtitle/description
- Published date
- Full HTML content (for Substack to pull)
- Canonical URL pointing to jcosta.tech/writing/{slug}/
- Cover image as enclosure

## Part 3: GitHub Actions Workflow

Replace the current Hashnode-based workflows with a single unified pipeline.

### New workflow: `build-and-deploy.yml`

Triggers:
- Push to `main` (when new post markdown is committed)
- Manual dispatch (for rebuilds)
- Scheduled (daily at 6 AM UTC for OSS stats, same as current)

Steps:
1. `scripts/build-posts.mjs` — render markdown to HTML pages
2. `scripts/generate-feed.mjs` — generate RSS feed
3. `scripts/update-oss-stats.mjs` — fetch OSS data (existing)
4. `scripts/embed-data.mjs` — update homepage with post listings + OSS data
5. Commit generated files if changed
6. GitHub Pages deploys automatically

### What to remove
- `scripts/update-posts.mjs` (fetches from Hashnode — no longer needed)
- `.github/workflows/update-posts.yml` (Hashnode webhook trigger)
- `workers/hashnode-webhook.js` (Cloudflare Worker for Hashnode webhooks)

### What to keep
- `.github/workflows/update-oss-stats.yml` (or merge into unified workflow)
- `scripts/update-oss-stats.mjs`
- `scripts/embed-data.mjs` (modified to read from local posts)

## Part 4: Publishing Workflow (day-to-day)

The end-to-end flow for publishing a new post:

1. Write post as markdown in `posts/new-post-slug.md`
2. Add cover image to `assets/covers/new-post-slug.png`
3. Commit and push to main
4. GitHub Actions builds HTML page, updates homepage, generates RSS
5. Zapier/Make detects new RSS item → creates Substack draft
6. Open Substack, review draft, click publish

Steps 1-4 are fully automated. Step 5 is automated with a ~15 min delay (RSS polling). Step 6 is the one manual action.

## Part 5: Newsletter Migration

1. Export Hashnode newsletter subscriber list (Settings → Newsletter → Export)
2. Import subscribers into Substack
3. Update the newsletter subscribe link on jcosta.tech from `blog.jcosta.tech/newsletter` to the Substack subscribe URL
4. Send a final Hashnode newsletter announcing the move to Substack

## Part 6: Hashnode Cleanup

After everything is running:
1. Set up redirects from blog.jcosta.tech posts to jcosta.tech/writing/{slug}/
2. Update `sameAs` in structured data (replace blog.jcosta.tech with Substack URL)
3. Optionally keep blog.jcosta.tech alive with a redirect notice, or let the domain lapse

## Open Questions

- Do you want Substack posts to be full content or excerpts with "read more on jcosta.tech"?
- Do you want to automate the Substack publish step (fully hands-free) or keep it as a manual review?
- Any other platforms to cross-post to (Dev.to, LinkedIn articles, etc.)?

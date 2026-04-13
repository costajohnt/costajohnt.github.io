# jcosta.tech

Personal portfolio and blog. Vanilla HTML/CSS/JS with an automated data pipeline.

## Architecture

- Static HTML pages with data injected between `<!-- BEGIN:SECTION -->` / `<!-- END:SECTION -->` markers
- `scripts/embed-data.mjs` reads `data/*.json` and injects into `index.html`, `writing.html`, `contributions.html`
- `scripts/build-posts.mjs` generates blog post pages from `posts/*.md`
- GitHub Actions update OSS stats and posts daily

## After editing

- After changing the nav or shared page chrome in `build-posts.mjs`, run `node scripts/build-posts.mjs` to regenerate all blog post pages
- After changing `data/*.json`, run `node scripts/embed-data.mjs` to re-embed
- After adding a new post, use `node scripts/publish-post.mjs <slug>`

## Blog post slugs

- Keep slugs to 3-5 words max: `/writing/homelab-six-months/` not `/writing/from-raspberry-pi-to-17-container-homelab-in-six-months/`
- Capture the core idea, drop filler words (articles, prepositions, conjunctions)
- Use kebab-case, all lowercase
- Slugs are permanent once published (they become URLs), so get them right before publishing

/**
 * Single source of truth for the static "chrome" pages: every hand-authored
 * page that carries the injected NAV/FOOTER/HEAD_COMMON/HEAD_FONTS partials
 * (embed-data.mjs) and belongs in sitemap.xml (generate-feed.mjs, which
 * excludes 404.html).
 *
 * Order matters: generate-feed.mjs emits sitemap entries in this order.
 *
 * Shell consumers can't import this list; they carry a synced copy with a
 * comment pointing here:
 *   - .githooks/pre-commit (auto-stage list)
 *   - .github/workflows/build-site.yml (git add list)
 */
export const CHROME_PAGES = [
  'index.html',
  'writing.html',
  'contributions.html',
  'about.html',
  'testimonials.html',
  'contact.html',
  '404.html',
];

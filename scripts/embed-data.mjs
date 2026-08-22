import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { escapeHtml } from './lib/html.mjs';
import { formatDate, formatStars } from './lib/format.mjs';
import { loadCoverMeta } from './lib/covers.mjs';
import { buildSparklineSVG, monthlyCounts } from './lib/sparkline.mjs';
import { PROJECT_REPOS } from './lib/projects.mjs';
import { renderWritingListHTML } from './lib/post-list.mjs';
import { CHROME_PAGES } from './lib/pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const COVER_META = loadCoverMeta(ROOT);

function generateStatsHTML(stats) {
  // Parse repos value (e.g. "20+") into numeric part and suffix
  const reposStr = String(stats.repos);
  const reposMatch = reposStr.match(/^(\d+)(.*)$/);
  const reposCount = reposMatch ? reposMatch[1] : reposStr;
  const reposSuffix = reposMatch && reposMatch[2] ? ` data-suffix="${escapeHtml(reposMatch[2])}"` : '';

  return [
    `        <div class="contrib-stat">`,
    `          <div class="number accent-num" data-count="${stats.prsMerged}">${stats.prsMerged}</div>`,
    `          <div class="label">PRs Merged</div>`,
    `        </div>`,
    `        <div class="contrib-stat">`,
    `          <div class="number neutral-num" data-count="${reposCount}"${reposSuffix}>${reposStr}</div>`,
    `          <div class="label">Repos</div>`,
    `        </div>`,
    `        <div class="contrib-stat">`,
    `          <div class="number green-num" data-count="${stats.languages}">${stats.languages}</div>`,
    `          <div class="label">Languages</div>`,
    `        </div>`,
  ].join('\n');
}

function generateReposHTML(contributions) {
  return contributions
    .map((c) => {
      const prText =
        c.prs != null
          ? ` <span class="repo-chip-sep">&middot;</span> <span class="repo-chip-prs"><strong>${c.prs}</strong> PRs</span>`
          : '';
      return [
        `          <a href="${escapeHtml(c.url)}" class="repo-chip">`,
        `            <span class="repo-chip-name">${escapeHtml(c.repo)}</span>`,
        `            <span class="repo-chip-meta"><span class="repo-chip-stars">&#9733; ${escapeHtml(String(c.stars))}</span>${prText}</span>`,
        `          </a>`,
      ].join('\n');
    })
    .join('\n');
}

function generateRecentPRsHTML(prs) {
  return prs
    .slice(0, 5)
    .map((pr) => {
      const date = formatDate(pr.mergedAt.slice(0, 10));
      const starsDisplay = formatStars(pr.stars);
      return [
        `          <a href="${escapeHtml(pr.url)}" class="recent-pr-item">`,
        `            <div>`,
        `              <h3>${escapeHtml(pr.title)}</h3>`,
        `              <p class="recent-pr-repo">${escapeHtml(pr.repo)}#${pr.number}</p>`,
        `            </div>`,
        `            <span class="recent-pr-stars">&#9733; ${escapeHtml(starsDisplay)}</span>`,
        `            <span class="recent-pr-lang">${escapeHtml(pr.language)}</span>`,
        `            <span class="recent-pr-date">${date}</span>`,
        `          </a>`,
      ].join('\n');
    })
    .join('\n');
}

function generateContribStatsHTML(stats) {
  return [
    `        <span class="contributions-stat"><strong>${stats.prsMerged}</strong> PRs merged</span>`,
    `        <span class="contributions-stat"><strong>${stats.repos}</strong> repos</span>`,
    `        <span class="contributions-stat"><strong>${stats.languages}</strong> languages</span>`,
  ].join('\n');
}

function generateAllPRsHTML(prs) {
  const out = [];
  let currentMonth = '';
  for (const pr of prs) {
    const monthKey = pr.mergedAt.slice(0, 7);
    if (monthKey !== currentMonth) {
      currentMonth = monthKey;
      const [y, m] = monthKey.split('-').map(Number);
      out.push(`        <div class="pr-month-divider" data-divider><span>${MONTH_NAMES[m - 1]} ${y}</span></div>`);
    }
    const date = formatDate(pr.mergedAt.slice(0, 10));
    const starsDisplay = formatStars(pr.stars);
    const lang = pr.language || 'Other';
    out.push([
      `        <a href="${escapeHtml(pr.url)}" class="pr-list-item" data-language="${escapeHtml(lang)}">`,
      `          <div>`,
      `            <h3>${escapeHtml(pr.title)}</h3>`,
      `            <p class="pr-list-repo">${escapeHtml(pr.repo)}#${pr.number}</p>`,
      `          </div>`,
      `          <span class="pr-list-stars">&#9733; ${escapeHtml(starsDisplay)}</span>`,
      `          <span class="pr-list-lang"><span class="lang-dot" data-lang="${escapeHtml(lang)}"></span>${escapeHtml(lang)}</span>`,
      `          <span class="pr-list-date">${date}</span>`,
      `        </a>`,
    ].join('\n'));
  }
  return out.join('\n');
}

// Hero live-data card: headline stats + a self-drawing sparkline of merges
// per month over the trailing six calendar months.
function generateHeroCardHTML(stats, prs) {
  const { anchor } = monthlyCounts(prs, 6);
  const updated = anchor.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const svg = buildSparklineSVG(prs, { monthCount: 6, width: 300, height: 104, gradientId: 'sparkFadeHero' });

  const reposStr = String(stats.repos);
  const reposMatch = reposStr.match(/^(\d+)(.*)$/);
  const reposCount = reposMatch ? reposMatch[1] : reposStr;
  const reposSuffix = reposMatch && reposMatch[2] ? ` data-suffix="${escapeHtml(reposMatch[2])}"` : '';

  return [
    `      <div class="hero-card-head">`,
    `        <span class="hero-card-title"><span class="pulse" aria-hidden="true"></span>Open source, live</span>`,
    `        <span class="hero-card-updated">updated ${updated}</span>`,
    `      </div>`,
    `      <div class="hero-card-stats">`,
    `        <div class="hero-card-stat"><div class="v" data-count="${stats.prsMerged}">${stats.prsMerged}</div><div class="k">PRs merged</div></div>`,
    `        <div class="hero-card-stat"><div class="v" data-count="${reposCount}"${reposSuffix}>${reposStr}</div><div class="k">Repos</div></div>`,
    `        <div class="hero-card-stat"><div class="v" data-count="${stats.languages}">${stats.languages}</div><div class="k">Languages</div></div>`,
    `      </div>`,
    `      <div class="hero-spark">`,
    svg,
    `      </div>`,
    `      <div class="hero-card-foot">`,
    `        <a class="link-arrow" href="contributions.html">Every merged PR <span class="arr">&rarr;</span></a>`,
    `      </div>`,
  ].join('\n');
}

// Top-tag pills for writing.html, from data/tags.json (written by build-posts)
function generateTagCloudHTML(tags) {
  return tags
    .slice(0, 12)
    .map((t) =>
      `        <a class="tag-pill" href="/writing/tags/${t.slug}/">${escapeHtml(t.tag)}<span class="tag-pill-count">${t.count}</span></a>`
    )
    .join('\n');
}

// 18-month full-width chart for contributions.html
function generateContribChartHTML(prs) {
  return [
    `      <div class="contrib-chart spark-chart" data-spark="scroll">`,
    buildSparklineSVG(prs, { monthCount: 18, width: 760, height: 150, gradientId: 'sparkFadeContrib', labelEvery: 2 }),
    `      </div>`,
  ].join('\n');
}

// Language filter chips, ordered by frequency
function generateContribFiltersHTML(prs) {
  const counts = new Map();
  for (const pr of prs) {
    const lang = pr.language || 'Other';
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  const chips = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([lang, n]) =>
      `        <button class="filter-chip" data-filter="${escapeHtml(lang)}" aria-pressed="false">${escapeHtml(lang)}<span class="filter-chip-count">${n}</span></button>`
    );
  return [
    `        <button class="filter-chip active" data-filter="all" aria-pressed="true">All<span class="filter-chip-count">${prs.length}</span></button>`,
    ...chips,
  ].join('\n');
}

// "What I'm building" live meta rows; tolerant of a missing projects.json
function generateProjectLiveHTML(repo, projects) {
  const p = projects?.[repo];
  if (!p) return `        <span class="oss-live-item">github.com/${escapeHtml(repo)}</span>`;
  const pushed = p.pushedAt ? formatDate(p.pushedAt) : '';
  const parts = [];
  if (p.stars > 0) parts.push(`        <span class="oss-live-item">&#9733; ${escapeHtml(formatStars(p.stars))}</span>`);
  if (pushed) {
    if (parts.length) parts.push(`        <span class="oss-live-sep">&middot;</span>`);
    parts.push(`        <span class="oss-live-item">pushed ${pushed}</span>`);
  }
  return parts.length ? parts.join('\n') : `        <span class="oss-live-item">github.com/${escapeHtml(repo)}</span>`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function replaceBetweenMarkers(html, beginMarker, endMarker, newContent) {
  if (!html.includes(beginMarker) || !html.includes(endMarker)) {
    throw new Error(`Markers not found: ${beginMarker} / ${endMarker}`);
  }
  const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(${escaped(beginMarker)})([\\s\\S]*?)( *${escaped(endMarker)})`,
    'g'
  );
  // Replacer function so $-sequences in newContent (e.g. a PR title
  // containing $` or $&) are inserted literally instead of expanded.
  return html.replace(pattern, (match, begin, _old, end) => `${begin}\n${newContent}\n${end}`);
}

function main() {
  const postsData = JSON.parse(
    readFileSync(join(ROOT, 'data', 'posts.json'), 'utf8')
  );
  if (!Array.isArray(postsData.posts)) {
    throw new Error('data/posts.json: missing or invalid "posts" array');
  }
  const ossData = JSON.parse(
    readFileSync(join(ROOT, 'data', 'oss-stats.json'), 'utf8')
  );
  if (!ossData.stats || !Array.isArray(ossData.contributions)) {
    throw new Error('data/oss-stats.json: missing "stats" or "contributions"');
  }
  const mergedPRsData = JSON.parse(
    readFileSync(join(ROOT, 'data', 'merged-prs.json'), 'utf8')
  );
  if (!Array.isArray(mergedPRsData.prs)) {
    throw new Error('data/merged-prs.json: missing or invalid "prs" array');
  }

  const indexPath = join(ROOT, 'index.html');
  let html = readFileSync(indexPath, 'utf8');

  html = replaceBetweenMarkers(
    html,
    '<!-- BEGIN:HERO_CARD -->',
    '<!-- END:HERO_CARD -->',
    generateHeroCardHTML(ossData.stats, mergedPRsData.prs)
  );

  html = replaceBetweenMarkers(
    html,
    '<!-- BEGIN:OSS_STATS -->',
    '<!-- END:OSS_STATS -->',
    generateStatsHTML(ossData.stats)
  );

  html = replaceBetweenMarkers(
    html,
    '<!-- BEGIN:OSS_REPOS -->',
    '<!-- END:OSS_REPOS -->',
    generateReposHTML(ossData.contributions)
  );

  html = replaceBetweenMarkers(
    html,
    '<!-- BEGIN:RECENT_PRS -->',
    '<!-- END:RECENT_PRS -->',
    generateRecentPRsHTML(mergedPRsData.prs)
  );

  html = replaceBetweenMarkers(
    html,
    '<!-- BEGIN:POSTS -->',
    '<!-- END:POSTS -->',
    renderWritingListHTML(postsData.posts, COVER_META)
  );

  let projectsData = null;
  try {
    projectsData = JSON.parse(readFileSync(join(ROOT, 'data', 'projects.json'), 'utf8')).projects;
  } catch {
    console.warn('data/projects.json missing; project cards show repo names only.');
  }
  for (const repo of PROJECT_REPOS) {
    html = replaceBetweenMarkers(
      html,
      `<!-- BEGIN:PROJ:${repo} -->`,
      `<!-- END:PROJ:${repo} -->`,
      generateProjectLiveHTML(repo, projectsData)
    );
  }

  writeFileSync(indexPath, html, 'utf8');
  console.log('index.html updated successfully.');

  // Generate contributions.html
  const contribPath = join(ROOT, 'contributions.html');
  let contribHtml = readFileSync(contribPath, 'utf8');

  contribHtml = replaceBetweenMarkers(
    contribHtml,
    '<!-- BEGIN:CONTRIB_STATS -->',
    '<!-- END:CONTRIB_STATS -->',
    generateContribStatsHTML(ossData.stats)
  );

  contribHtml = replaceBetweenMarkers(
    contribHtml,
    '<!-- BEGIN:CONTRIB_CHART -->',
    '<!-- END:CONTRIB_CHART -->',
    generateContribChartHTML(mergedPRsData.prs)
  );

  contribHtml = replaceBetweenMarkers(
    contribHtml,
    '<!-- BEGIN:CONTRIB_FILTERS -->',
    '<!-- END:CONTRIB_FILTERS -->',
    generateContribFiltersHTML(mergedPRsData.prs)
  );

  contribHtml = replaceBetweenMarkers(
    contribHtml,
    '<!-- BEGIN:ALL_PRS -->',
    '<!-- END:ALL_PRS -->',
    generateAllPRsHTML(mergedPRsData.prs)
  );

  writeFileSync(contribPath, contribHtml, 'utf8');
  console.log('contributions.html updated successfully.');

  // Generate writing.html
  const writingPath = join(ROOT, 'writing.html');
  let writingHtml = readFileSync(writingPath, 'utf8');

  writingHtml = replaceBetweenMarkers(
    writingHtml,
    '<!-- BEGIN:ALL_POSTS -->',
    '<!-- END:ALL_POSTS -->',
    renderWritingListHTML(postsData.posts, COVER_META)
  );

  const tagsData = JSON.parse(readFileSync(join(ROOT, 'data', 'tags.json'), 'utf8'));
  writingHtml = replaceBetweenMarkers(
    writingHtml,
    '<!-- BEGIN:TAG_CLOUD -->',
    '<!-- END:TAG_CLOUD -->',
    generateTagCloudHTML(tagsData.tags)
  );

  writeFileSync(writingPath, writingHtml, 'utf8');
  console.log('writing.html updated successfully.');

  // Inject shared chrome (nav + footer + invariant head blocks) from
  // partials/ into every static page. Post pages get the same partials at
  // build time via build-posts. The head partials store their final 2-space
  // indentation, so they're injected verbatim.
  const navHtml = readFileSync(join(ROOT, 'partials', 'nav.html'), 'utf8');
  const footerHtml = readFileSync(join(ROOT, 'partials', 'footer.html'), 'utf8');
  const headCommonHtml = readFileSync(join(ROOT, 'partials', 'head-common.html'), 'utf8').trimEnd();
  const headFontsHtml = readFileSync(join(ROOT, 'partials', 'head-fonts.html'), 'utf8').trimEnd();
  for (const page of CHROME_PAGES) {
    const pagePath = join(ROOT, page);
    let pageHtml = readFileSync(pagePath, 'utf8');
    pageHtml = replaceBetweenMarkers(pageHtml, '<!-- BEGIN:HEAD_COMMON -->', '<!-- END:HEAD_COMMON -->', headCommonHtml);
    pageHtml = replaceBetweenMarkers(pageHtml, '<!-- BEGIN:HEAD_FONTS -->', '<!-- END:HEAD_FONTS -->', headFontsHtml);
    pageHtml = replaceBetweenMarkers(pageHtml, '<!-- BEGIN:NAV -->', '<!-- END:NAV -->', `  ${navHtml}`);
    pageHtml = replaceBetweenMarkers(pageHtml, '<!-- BEGIN:FOOTER -->', '<!-- END:FOOTER -->', `    ${footerHtml}`);
    writeFileSync(pagePath, pageHtml, 'utf8');
  }
  console.log('shared chrome injected into static pages.');

  // sitemap.xml is owned by generate-feed.mjs, which derives honest lastmod
  // values from post dates and PR data instead of stamping today's date.
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (err) {
    console.error('Failed to embed data:', err);
    process.exit(1);
  }
}

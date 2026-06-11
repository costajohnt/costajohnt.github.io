import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { escapeHtml } from './lib/html.mjs';
import { formatDate, formatStars } from './lib/format.mjs';
import { loadCoverMeta, webpThumb } from './lib/covers.mjs';

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

function generatePostsHTML(posts) {
  return posts
    .map((p) => {
      const thumbVariant = p.coverImage ? webpThumb(p.coverImage, COVER_META) : null;
      const thumb = p.coverImage
        ? (thumbVariant
            ? `          <img src="${escapeHtml(thumbVariant.src)}" alt="" class="writing-thumb" loading="lazy" width="${thumbVariant.width}" height="${thumbVariant.height}">`
            : `          <img src="${escapeHtml(p.coverImage)}" alt="" class="writing-thumb" loading="lazy">`)
        : `          <div class="writing-thumb writing-thumb-empty"></div>`;
      return [
        `        <a href="${escapeHtml(p.url)}" class="writing-item">`,
        `          <span class="writing-date">${formatDate(p.date)}</span>`,
        thumb,
        `          <div>`,
        `            <h3>${escapeHtml(p.title)}</h3>`,
        `            <p class="subtitle">${escapeHtml(p.subtitle)}</p>`,
        `          </div>`,
        `          <span class="writing-time">${escapeHtml(p.readTime)}</span>`,
        `        </a>`,
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
  return prs
    .map((pr) => {
      const date = formatDate(pr.mergedAt.slice(0, 10));
      const starsDisplay = formatStars(pr.stars);
      return [
        `        <a href="${escapeHtml(pr.url)}" class="pr-list-item">`,
        `          <div>`,
        `            <h3>${escapeHtml(pr.title)}</h3>`,
        `            <p class="pr-list-repo">${escapeHtml(pr.repo)}#${pr.number}</p>`,
        `          </div>`,
        `          <span class="pr-list-stars">&#9733; ${escapeHtml(starsDisplay)}</span>`,
        `          <span class="pr-list-lang">${escapeHtml(pr.language)}</span>`,
        `          <span class="pr-list-date">${date}</span>`,
        `        </a>`,
      ].join('\n');
    })
    .join('\n');
}

// Hero live-data card: headline stats + a self-drawing sparkline of merges
// per month over the trailing six calendar months.
function generateHeroCardHTML(stats, prs) {
  const newest = prs[0]?.mergedAt ?? new Date().toISOString();
  const anchor = new Date(newest.slice(0, 10) + 'T00:00:00Z');

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    months.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
      count: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const pr of prs) {
    const m = byKey.get(pr.mergedAt.slice(0, 7));
    if (m) m.count += 1;
  }

  const max = Math.max(1, ...months.map((m) => m.count));
  const X0 = 12, X1 = 288, Y0 = 10, Y1 = 78;
  const xs = (i) => X0 + (i * (X1 - X0)) / (months.length - 1);
  const ys = (c) => Y1 - (c / max) * (Y1 - Y0);
  const pts = months.map((m, i) => ({ x: xs(i), y: ys(m.count), ...m }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${X1},${Y1 + 2} L${X0},${Y1 + 2} Z`;
  const peak = pts.reduce((a, b) => (b.count > a.count ? b : a));

  const dots = pts.map((p) =>
    `        <circle class="spark-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"/>`
  ).join('\n');
  const labels = pts.map((p) =>
    `        <text class="spark-axis" x="${p.x.toFixed(1)}" y="100" text-anchor="middle">${p.label}</text>`
  ).join('\n');
  const series = months.map((m) => `${m.label} ${m.count}`).join(', ');
  const updated = anchor.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

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
    `        <svg viewBox="0 0 300 104" role="img" aria-label="Merged pull requests per month: ${series}">`,
    `          <defs>`,
    `            <linearGradient id="sparkFade" x1="0" y1="0" x2="0" y2="1">`,
    `              <stop offset="0" stop-color="#6366f1" stop-opacity="0.18"/>`,
    `              <stop offset="1" stop-color="#6366f1" stop-opacity="0"/>`,
    `            </linearGradient>`,
    `          </defs>`,
    `          <path class="spark-area" d="${area}"/>`,
    `          <path class="spark-line" d="${line}"/>`,
    dots,
    `        <text class="spark-peak-label" x="${peak.x.toFixed(1)}" y="${(peak.y - 7).toFixed(1)}" text-anchor="middle">${peak.count}</text>`,
    labels,
    `        </svg>`,
    `      </div>`,
    `      <div class="hero-card-foot">`,
    `        <a class="link-arrow" href="contributions.html">Every merged PR <span class="arr">&rarr;</span></a>`,
    `      </div>`,
  ].join('\n');
}

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
    generatePostsHTML(postsData.posts)
  );

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
    generatePostsHTML(postsData.posts)
  );

  writeFileSync(writingPath, writingHtml, 'utf8');
  console.log('writing.html updated successfully.');

  // Inject shared chrome (nav + footer) from partials/ into every static
  // page. Post pages get the same partials at build time via build-posts.
  const navHtml = readFileSync(join(ROOT, 'partials', 'nav.html'), 'utf8');
  const footerHtml = readFileSync(join(ROOT, 'partials', 'footer.html'), 'utf8');
  const chromePages = ['index.html', 'about.html', 'contact.html', 'writing.html', 'testimonials.html', 'contributions.html', '404.html'];
  for (const page of chromePages) {
    const pagePath = join(ROOT, page);
    let pageHtml = readFileSync(pagePath, 'utf8');
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

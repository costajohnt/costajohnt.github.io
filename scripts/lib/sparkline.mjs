/**
 * SVG sparkline of merged PRs per month, shared by the homepage hero card
 * (6 months, compact) and the contributions page chart (18 months, wide).
 * Pure string generation; animation is applied client-side by animations.js.
 */

/** Aggregate PRs into the trailing `monthCount` calendar months. */
export function monthlyCounts(prs, monthCount) {
  const newest = prs.find((p) => p.mergedAt)?.mergedAt ?? new Date().toISOString();
  const anchor = new Date(newest.slice(0, 10) + 'T00:00:00Z');

  const months = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    months.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
      year: d.getUTCFullYear(),
      count: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const pr of prs) {
    if (!pr.mergedAt) continue;
    const m = byKey.get(pr.mergedAt.slice(0, 7));
    if (m) m.count += 1;
  }
  return { months, anchor };
}

/**
 * Render the sparkline SVG.
 * labelEvery: render every Nth month label (1 = all, 3 = quarterly).
 */
export function buildSparklineSVG(prs, { monthCount = 6, width = 300, height = 104, gradientId = 'sparkFade', labelEvery = 1 } = {}) {
  const { months } = monthlyCounts(prs, monthCount);

  const max = Math.max(1, ...months.map((m) => m.count));
  const X0 = 12, X1 = width - 12, Y0 = 10, Y1 = height - 26;
  const xs = (i) => X0 + (i * (X1 - X0)) / (months.length - 1);
  const ys = (c) => Y1 - (c / max) * (Y1 - Y0);
  const pts = months.map((m, i) => ({ x: xs(i), y: ys(m.count), ...m }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${X1},${Y1 + 2} L${X0},${Y1 + 2} Z`;
  const peak = pts.reduce((a, b) => (b.count > a.count ? b : a));

  const dots = pts.map((p) =>
    `        <circle class="spark-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"/>`
  ).join('\n');
  const labels = pts
    .filter((_, i) => i % labelEvery === 0)
    .map((p) =>
      `        <text class="spark-axis" x="${p.x.toFixed(1)}" y="${height - 4}" text-anchor="middle">${p.label}${p.label === 'JAN' ? ` ${String(p.year).slice(2)}` : ''}</text>`
    ).join('\n');
  const series = months.map((m) => `${m.label} ${m.count}`).join(', ');

  return `        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Merged pull requests per month: ${series}">
          <defs>
            <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#6366f1" stop-opacity="0.18"/>
              <stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path class="spark-area" style="fill: url(#${gradientId})" d="${area}"/>
          <path class="spark-line" d="${line}"/>
${dots}
        <text class="spark-peak-label" x="${peak.x.toFixed(1)}" y="${(peak.y - 7).toFixed(1)}" text-anchor="middle">${peak.count}</text>
${labels}
        </svg>`;
}

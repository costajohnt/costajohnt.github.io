/**
 * Shared display formatting for dates and star counts.
 */

/** "2026-06-08" or "2026-06-08T10:00:00Z" → "2026-06-08" */
export function formatISODate(dateStr) {
  const str = String(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str.split('T')[0];
}

/** "2026-06-08" (time component tolerated) → "Jun 8, 2026" */
export function formatDate(dateStr) {
  const [year, month, day] = formatISODate(dateStr).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** 83950 → "84k", 35600 → "35.6k", 999 → "999". Round before the integer
 * check so x.0 never renders (the old order produced "84.0k"). */
export function formatStars(count) {
  if (count >= 1000) {
    const k = Math.round((count / 1000) * 10) / 10;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(count);
}

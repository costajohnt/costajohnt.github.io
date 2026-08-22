/**
 * XML escaping and RFC-822 date formatting for feed/sitemap generation.
 */
import { formatISODate } from './format.mjs';

export function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toRfc822(dateStr) {
  // Tolerate a time component the same way formatISODate does: strip it and
  // format midnight UTC, instead of producing "Invalid Date".
  const d = new Date(formatISODate(dateStr) + 'T00:00:00Z');
  return d.toUTCString();
}

/**
 * HTML escaping for generated markup. Sufficient for text nodes and
 * double-quoted attribute values; every generated attribute in this repo
 * uses double quotes, so single quotes are intentionally not escaped.
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

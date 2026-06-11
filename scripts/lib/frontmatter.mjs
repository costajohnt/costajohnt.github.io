/**
 * Canonical frontmatter parser shared by every script that reads posts/*.md.
 *
 * Supports the subset of YAML these posts actually use: scalar strings
 * (optionally quoted), JSON-style arrays, bare integers, and booleans as the
 * strings "true"/"false" (callers normalize, e.g. archived checks).
 *
 * Returns { meta, content }. When no frontmatter block is found, meta is
 * empty and content is the raw input.
 */
export function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1];
    let value = kvMatch[2].trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse arrays like ["tag1", "tag2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value);
      } catch (err) {
        console.warn(`  warning: failed to parse "${key}" as JSON in frontmatter, keeping as string: ${err.message}`);
      }
    }

    // Parse bare integers (e.g. readTime) — strings only, so an array whose
    // single element is numeric is not coerced.
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    meta[key] = value;
  }

  return { meta, content: match[2] };
}

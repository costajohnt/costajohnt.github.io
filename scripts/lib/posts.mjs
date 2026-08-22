/**
 * Post-pipeline logic extracted from build-posts.mjs for testability:
 * the custom markdown renderer, related-post ranking, and the prune guard.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { marked } from 'marked';
import { escapeHtml } from './html.mjs';

/** Custom renderer: code blocks with language labels, lazy-loading images. */
export function createRenderer() {
  const renderer = new marked.Renderer();

  renderer.code = function ({ text, lang }) {
    const escaped = escapeHtml(text);
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
    return `<pre${langAttr}><code>${escaped}</code></pre>\n`;
  };

  // Body images load lazily; they're always below the fold on post pages.
  // Note: `text` arrives unescaped from marked, so escapeHtml is correct for
  // raw &/</" but would double-escape an author-typed literal entity like
  // &amp; in alt text. No post does that; revisit if one ever needs to.
  renderer.image = function ({ href, title, text }) {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async">`;
  };

  return renderer;
}

/** Sort comparator: newest ISO date string first. */
export function compareDatesDesc(a, b) {
  if (a.date > b.date) return -1;
  if (a.date < b.date) return 1;
  return 0;
}

export function computeRelatedPosts(allPostsMeta, currentSlug, maxRelated = 3) {
  const current = allPostsMeta.find(p => p.slug === currentSlug);
  if (!current || !current.tags || current.tags.length === 0) return [];

  const currentTags = new Set(current.tags);

  return allPostsMeta
    .filter(p => p.slug !== currentSlug && !p.archived)
    .map(p => {
      const overlap = (p.tags || []).filter(t => currentTags.has(t)).length;
      return { ...p, overlap };
    })
    .filter(p => p.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || compareDatesDesc(a, b))
    .slice(0, maxRelated);
}

/**
 * Prune guard for writing/<name>/ dirs whose source post is gone. Only pages
 * carrying this generator's fingerprint (the canonical link the template
 * always emits) are safe to delete; anything else warrants a loud warning.
 *
 * Returns 'delete' | 'keep-warn' | 'skip'. The caller owns the rmSync.
 */
export function shouldPruneDir(dirPath, name, validSlugs) {
  if (validSlugs.has(name)) return 'skip';
  if (name === 'tags') return 'skip'; // tag pages pruned separately
  const indexPath = join(dirPath, 'index.html');
  const fingerprint = `<link rel="canonical" href="https://jcosta.tech/writing/${name}/">`;
  if (!existsSync(indexPath) || !readFileSync(indexPath, 'utf-8').includes(fingerprint)) {
    return 'keep-warn';
  }
  return 'delete';
}

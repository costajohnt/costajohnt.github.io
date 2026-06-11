/**
 * Lookup for the WebP cover variants produced by optimize-covers.mjs.
 * Falls back to the original image when no variant exists (e.g. a new
 * cover added without re-running the optimizer).
 */
import { readFileSync } from 'fs';
import { join, basename, extname } from 'path';

export function loadCoverMeta(root) {
  try {
    return JSON.parse(readFileSync(join(root, 'data', 'cover-meta.json'), 'utf-8'));
  } catch {
    return {};
  }
}

function nameOf(coverPath) {
  return basename(String(coverPath), extname(String(coverPath)));
}

/** Full-size cover variant: { src, width, height } or null. */
export function webpCover(coverPath, meta) {
  const name = nameOf(coverPath);
  const m = meta[name];
  if (!m) return null;
  return { src: `/assets/covers/webp/${name}.webp`, width: m.width, height: m.height };
}

/** Thumbnail variant: { src, width, height } or null. */
export function webpThumb(coverPath, meta) {
  const name = nameOf(coverPath);
  const m = meta[name];
  if (!m) return null;
  return { src: `/assets/covers/webp/${name}-thumb.webp`, width: m.thumbWidth, height: m.thumbHeight };
}
